(function($, Trello, document, global, undefined){
  'use strict';

  var body = $('body');
  var stage = $('#stage');
  var make_board = _.template($('#board-template').text());
  var make_list = _.template($('#list-template').text());
  var make_front = _.template($('#card-front-template').text());
  var make_back = _.template($('#card-back-template').text());

  function showBoards() {
    var options = { filter: 'open' };
    var renderBoards = function(boards){
      var html = _.template($('#project-list-template').text())({ boards: boards })
      stage.empty().append(html).delegate('.project button', 'click', function(){
        var id = $(this).data("board-id");
        var name = $(this).data("board-name");

        Trello.get('boards/' + id + '/cards/open', function(cards) {
          newPrint(cards, name);
        });
      })
    };
    Trello.get('members/me/boards',  options, renderBoards, handleErrors);
  }

  function newPrint(cards, boardName){
    $('body > *').hide();

    var data = {},
        main = $('<div id="board" class="print-board"></div>');

    data.boardName          = boardName;
    data.cards              = cards;
    data.includeDescription = $("#includeDescription").is(":checked");
    data.includeComments    = $("#includeComments").is(":checked");
    data.includeChecklists = $("#includeChecklists").is(":checked");
    data.includeCheckedItems = $("#includeCheckedItems").is(":checked");

    main.append($(make_board(data)));
    body.css("background-color", "#fff").append(main);

    /**
     * Add checklists
     */
    _.each(data.cards, function(card) {
      console.log(card);
      card.checklists = $('.checklists-' + card.id);
      _.each(card.idChecklists, function(checklistId) {
        Trello.checklists.get(checklistId, function(checklist){
          _.each(checklist.checkItems, function(checkItem) {
            checkItem.state = (checkItem.state === 'complete');
          });
          card.checklists.append($(make_list(checklist)));
        }, handleErrors);
      });
    });
  }

  function print(cards, boardName) {

    var fronts      = [];
    var backs       = [];

    $('body > *').hide();

    var main = $('<div id="pivotal-cards-pages" class="filing-colours"></div>');

    $(document).keyup(function(e) {
      if (e.keyCode == 27) {
        main.remove();
        $('body > *').show();
        body.css("background-color", "#37343A")
      }
    });

    body.css("background-color", "#fff").append(main);

    var cardCount = cards.length;
    var cardBuildIndex = 0;
    var printCoverImages = $("#printCovers").is(":checked");

    function buildItem(item){
      fronts.push($(make_front(item)));
      backs.push($(make_back(item)));
      cardBuildIndex++
    }

    _.each(cards, function(card) {

        var labels = _.chain(card.labels)
                      .map(function(label){ return label.name })
                      .reject(function(label) { return !label; })
                      .value()

        var item = {
          cardno       : card.idShort,
          id           : card.id,
          name         : card.name,
          description  : card.desc,
          project_name : boardName,
          tasks        : [],
          points       : "",
          labels       : labels,
          hasCover     : !!card.idAttachmentCover && printCoverImages
        };


        var loadChecklists = function(){
          if(card.idChecklists[0]) {
            Trello.checklists.get(card.idChecklists[0], function(checklist){
              _.each(checklist.checkItems, function(checkItems){
                item.tasks.push({
                  description: checkItems.name,
                  complete: checkItems.state == 'complete'
                })
              });

              buildItem(item);
            }, handleErrors)
          } else {
            buildItem(item);
          }
        };

        if(printCoverImages && item.hasCover){
          Trello.get("/cards/" + card.id + "/attachments/", {
            idAttachment: card.idAttachmentCover,
            fields: ["url"]
          }, function(image) {
            item.coverImageUrl = image[0].url;
            loadChecklists();
          }, handleErrors);
        } else {
          loadChecklists();
        }
    });

    var interval = setInterval(function(){
      if(cardCount == cardBuildIndex) {
        clearTimeout(interval);

        var cardno;
        var front_page;
        var back_page;

        for (cardno = 0; cardno < fronts.length; cardno++) {
          if ((cardno % 4) === 0) {
            front_page = $('<div class="page fronts"></div>');
            main.append(front_page);

            back_page = $('<div class="page backs"></div>');
            main.append(back_page);
          }
          front_page.append(fronts[cardno]);
          back_page.append(backs[cardno]);
        }

        window.print();

      }
    }, 100);
  }

  function auth() {
    Trello.authorize({
      type       : "redirect",
      success    : showBoards,
      name       : "Trello Cards",
      expiration : "1hour",
      persist    : true
    })
  }

  function handleErrors(xhr, message, error) {

    if(xhr.status == 401) {
      Trello.deauthorize()
      auth()
    }

    console.log(arguments)
  }

  if(/[&#]?token=([0-9a-f]{64})/.test(location.hash)){
    auth()
  } else {
    var authoriseButton = $('<button id="authorise">Authorise with Trello</button>').on('click', function(){
      if(Trello.authorized()){
        showBoards()
      } else {
        auth()
      }
    });
    stage.append(authoriseButton)
  }
})(jQuery, Trello, this, document);

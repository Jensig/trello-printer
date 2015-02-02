(function($, Trello, document, global, undefined){
  'use strict';

  var body = $('body');
  var stage = $('#stage');
  var make_board = _.template($('#board-template').text());
  var make_list = _.template($('#list-template').text());

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

    $("#includeDescription").change(function() {
      if($(this).is(":checked")){
        $('.desc').show();
      }else{
        $('.desc').hide();
      }
    });

    $("#includeChecklists").change(function() {
      if($(this).is(":checked")){
        $('.checklists').show();
      }else{
        $('.checklists').hide();
      }
    });

    $("#includeCheckedItems").change(function() {
      if($(this).is(":checked")){
        $('.item-checked').show();
      }else{
        $('.item-checked').hide();
      }
    });

    $("#includeLabels").change(function() {
      if($(this).is(":checked")){
        $('.labels').show();
      }else{
        $('.labels').hide();
      }
    });

    $(".hide-card").click(function() {
      $(this).parent().hide();
    });
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

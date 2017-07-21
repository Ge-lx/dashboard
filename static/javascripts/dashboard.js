$(document).ready(function() {
  var cat_open = null; //null -> Dashbaord / (INT) -> Category ID

  var dayOfWeek = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var oldMinute; //for seconds

  runClock();

   // Debug
   // --------------------
   var bla = false;

   function debugToggle() {
    if( bla ) {
      showOverlay();
    } else {
      hideOverlay();
    }
    bla = !bla;
    setTimeout(debugToggle, 3000);
   }

   //debugToggle();
   // --------------------

  $('.back_container').on('click', close_category);

  $('.documents_holder').on('click', '.card[data-category]', function(event) {
    var cat_id = $(event.currentTarget).data('category');

    switch(cat_open){
      case null:
        open_category(cat_id); break;
      case cat_id:
        close_category(); break;
      default:
        close_category();
        setTimeout(open_category, 400, cat_id); break;
    }
  });

  function showDocOverlay(document) {
    
  }

  function showOverlay() {
    var overlay = $('#overlay');
    overlay.removeClass('gone');

    setTimeout( function() {
      overlay.removeClass('hidden');
    }, 200);
  }

  function hideOverlay() {
    var overlay = $('#overlay');
    overlay.addClass('hidden');

    setTimeout( function() {
      overlay.addClass('gone');
    }, 300);
  }

  function close_category() {
    console.log('Closing category...');
    $('.card[data-category=' + cat_open + ']').removeClass('active');
    // $('#level_1').removeClass('hidden');
    $('.switcher').removeClass('l2');
    $('.back_container').addClass('hidden');
    cat_open = null;
  }

  function open_category(id) {
    console.log('Yo, opening ' + id);

    var category = data.categories[id];

    $('#level_2 > .links_heading').html(category.name);

    var documents = category.documents;

    var documents_holder = $('#documents');
    documents_holder.empty();

    Object.getOwnPropertyNames(documents).forEach(function(val, index) {
      var doc = getDocumentCard(val, documents[val].name);
      documents_holder.append(doc);
    });

    $('.card[data-category=' + id + ']').addClass('active');
    // $('#level_1').addClass('hidden');
    $('.switcher').addClass('l2');
    setTimeout(function() { $('.back_container').removeClass('hidden');}, 200);
    cat_open = id;
  }

  function runClock(){
    var add0 = function(s) { return (s < 10) ? '0' + s : s};
    var now = new Date();
    if(now.getMinutes() !== oldMinute) {
      var pointer = $('p.pointer_left');
      pointer.removeClass('pointer_right');
      setTimeout(function() { pointer.addClass('pointer_right')}, 500);
    }
    $('.time').html(add0(now.getHours()) + ':' + add0(now.getMinutes()) );
    $('.day_of_week').html(dayOfWeek[now.getDay()]);
    $('.date').html(add0(now.getDate()) + '.' + add0(now.getMonth() + 1) + '.' + now.getFullYear() );
    oldMinute = now.getMinutes();
    setTimeout(runClock, 1000);
  }

});

function getDocumentCard(id, title) {
  return "<a href='/getFile/" + id + "' class='card' data-file='" + id + "'><div class='card_body_nopad'><img class='card_img' src='./images/links/default.svg'></div><h class='card_bottom_text'>" + title + "</h></div>"
  //return "<div class='card' data-file='" + id + "'><div class='card_body_nopad'><img class='card_img' src='./img/files/" + id + ".png'></div><h class='card_bottom_text'>" + title + "</h></div>"
}

// UNSAFE with unsafe strings; only use on previously-escaped ones!
function unescapeHtml(escapedStr) {
  var div = document.createElement('div');
  div.innerHTML = escapedStr;
  var child = div.childNodes[0];
  return child ? child.nodeValue : '';
}


var editors = new Array();
var popup = false;
var toolbarOptions = [
                      ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                      ['blockquote', 'code-block', 'image'],

                      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent

                      [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
                      [{ 'font': [] }],
                      [{ 'align': [] }],

                      ['clean']                                         // remove formatting button
                      ];
                      
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

$(document).ready( function(){

  //Toggle menu
  $("#menu_label").click( function(event){
    event.stopImmediatePropagation();
    $("#menu").toggleClass("menu_container_expanded");
  });

  //Scroll to anchor elements
  $('a[href^="#"]').on('click', function(event) {
    event.preventDefault();
    target = $("#" + this.href.split("#")[1]);
      if( target.length ) {
          $('html, body').animate({
              scrollTop: target.offset().top - 55 /*Header -> Offset 55px*/
          }, 300);
      }
  });

  //Close menu when clicking outside of it
  $("*").click( function() {
    if(popup) {
      $('#message_bg').fadeOut('fast');
      popup = false;
    }
    if($(this) != $("#menu") ){
      $("#menu").removeClass("expanded");
    }
  });
});

function hidePopup(){
  $('#message_bg').fadeOut('fast');
  popup = false;
}

function showPopup(msg, title, autohide) {
  if(msg) {
    $('#msg_title').text(title || 'Info');
    if(typeof msg !== 'string') {
      $('#msg_html').html(msg);
    } else {
      $('#msg_html').html( $('<p></p>').text(msg));
    }
    
  }
  $('#message_bg').fadeIn('fase');
  popup = autohide === undefined ? true : autohide;
}

function showDialog(title, msg, funOK, funCANCEL) {
    if(!funCANCEL) {
        var funCANCEL = function(){};
    }

    var dialog = $('<div></div>').append(
        $('<p></p>').text(msg)).append(
        $('<button></button>', {
            'class': 'material_button',
            'style' : 'float: right; background-color: #9e2b25;'
        }).text('OK').click(function(){ funOK(); hidePopup();})).append(
        $('<button></button>', {
            'class': 'material_button',
            'style' : 'float: right; margin-right: 10px;'
        }).text('Cancel').click(function(){ funCANCEL(); hidePopup();}));

    showPopup(dialog, title, false);
}

// UNSAFE with unsafe strings; only use on previously-escaped ones!
function unescapeHtml(escapedStr) {
  var div = document.createElement('div');
  div.innerHTML = escapedStr;
  var child = div.childNodes[0];
  return child ? child.nodeValue : '';
}

function newQuill(divID, enabled, delta) {
  var quill = new Quill(divID, {
        modules: {
            toolbar: toolbarOptions               
        },
        theme: 'snow'
    });

    if(!(delta === undefined)) 
      quill.setContents(delta, 'silent'); //POSSIBLY UNSAFE CHECK FOR INJECTION OF JS

    quill.enable(enabled);
    editors.push(quill);
    return quill;
}
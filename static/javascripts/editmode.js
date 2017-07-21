const new_menu_entry = '<li class="menu_item menu_item_expanded" data-index="{index}"><a href="">New entry</a><div class="divider"></div><div class="menu_dropdown"><label class="menu_dropdown_label" for="label">Label:</label><input class="menu_label_input" type="name" name="label" value="" data-index="{index}"><label class="menu_dropdown_label" for="href">Link:</label><input class="menu_href_input" type="name" name="href" value="" data-index="{index}"><button class="material_button material_button_critical menu_delete" type="button" data-index="{index}">DELETE</button><button class="material_button menu_save" type="button" data-index="{index}">OK</button></div></li>';
const new_card = '<div class="card" id="{index}"><div class="row"><div class="col-8 col-m-8"><div id="editor_{index}"></div></div></div><div class="row deletecardbutton" style="display: block;"><div class="col-8 col-m-8"><button class="material_button deletecardbutton" style="display: inline-block;">DELETE</button></div></div></div>';

var editmode = false;

var menu = [];

$(document).ready( function(){

	console.log(menu.size);

	$('#newmenubutton').click( function(event) {
		if(!editmode) return;

		var last_menu_item = $('.menu_item[data-index]').last();
		var newIndex = parseInt(last_menu_item.attr('data-index')) + 1;

		var new_menu_item = new_menu_entry.replaceAll('{index}', newIndex);

		last_menu_item.after(new_menu_item);

		showPopup('Hover over new entry to edit it.', 'New entry added');
	});

	$(document).on('click', '.menu_delete', function(event) {
		if(!editmode) return;
		var target = $(event.target);

		var index = target.attr('data-index');
		var menu_item = target.parents('.menu_item');

		showDialog('Delete item', 'This will remove this item from the menu.', function() {
			delete menu[index];
			menu_item.remove();
		});
	});

	$(document).on('click', '.menu_save', function(event) {
		if(!editmode) return;
		var target = $(event.target);

		var link = target.parent().siblings('a');
		var labelInput = target.siblings('.menu_label_input');
		var hrefInput = target.siblings('.menu_href_input');
		var index = target.attr('data-index');

		var label = labelInput.val();
		var href = hrefInput.val();

		menu[index] = {'label': label, 'href': href};

		link.attr('href', href);
		link.html(label);

		showPopup('To save changes to server please click the "save" button in the top right corner.',
				'Menu changed', true);

	});

	$(document).on('click', '.deletecardbutton', function(event) {
		if(!editmode) return;
		var target = $(event.target);

		var confirm = function() {
			var card = target.parents('.card')
			var id = card.attr('id');

			delete editors[id];
			card.remove();
		}

		showDialog('Delete card', 'This will remove this card from the page.', confirm);
	});

	//Enable editbutton
	$('#editbutton').click( function() {
		if(!editmode) {

			editors.forEach( function(editor) {
				editor.enable();
			});

			editmode = true;
			changeEditView(true);

		} else {

			editmode = false;
			changeEditView(false);

			var clientChanges = createSendObject();

			showPopup('Sending changes to server...', 'Saving...', false);

			//console.log('Sending clientChanges: ' + JSON.stringify(clientChanges, null, 4) + '\n\n');

			var unescapedJSON = JSON.stringify(clientChanges);

			jQuery.ajax({
				url: window.location.pathname,
				type: 'POST',
				contentType:'application/json',
				data: unescapedJSON,
				dataType:'json'
			})
			.done(function(data, textStatus, jqXHR ) {
				console.log('-----DONE------');
				showPopup('Changes successfully sent.', 'Saved');
				setTimeout(hidePopup, 1000);
			}).fail(function(jqXHR, textStatus, errorThrown ) {
			    showPopup(textStatus);
				setTimeout(hidePopup, 1000);
			});
		}
	});


	$('#newcardbutton').click( function() {
		if(!editmode) return;

		var cards = $('.card')
		var newID = cards.length > 0 ? parseInt(cards.last().attr('id') ) + 1 : 0;

		/*var newCard = $('<div></div>', {
			'id': newID,
  			'class': 'card'
  		}).append( $('<div></div>', {
			'class': 'row' 
		}).append( $('<div></div>', {
			'class': 'col-8 col-m-8'
		}).append( $('<div></div>', {
			'id': ('editor_' + newID)
		}) )));*/
		var newCard = $(new_card.replaceAll('{index}', newID));

		newCard.insertBefore($('#insertcardhere'));

		newQuill('#editor_' + newID, true);
		changeEditView(true);

		newCard.slideDown('fast');
	});

});

function changeEditView(enable) {
	if(!enable) {
		$('#newmenubutton').hide('fast');
		$('.menu_item').removeClass('menu_item_expanded');
		$('.menu_dropdown').hide('fast');
		$('.ql-container').css('border', 'none');
		$('.ql-toolbar').hide('fast');
		$('#editbutton').html('EDIT');
		$('#newcardbutton').slideUp('fast');
		$('.deletecardbutton').slideUp('fast');
	} else {
		$('#newmenubutton').show();
		$('.menu_item').addClass('menu_item_expanded');
		$('.menu_dropdown').show('fast');
		$('#editbutton').html('SAVE');
		$('.ql-container').css({
			'border': '1px solid #ccc',
			'border-top': '0px'
		});
		$('.ql-toolbar').show('fast');
		$('#newcardbutton').slideDown('fast');
		$('.deletecardbutton').slideDown('fast');
	}
}

function createSendObject() {
	var site = { subsites: {} };
	site.subsites[subsite] = { cards: [] };
	site.menu = [];

	menu.forEach( function(item) {
		site.menu.push(item);
	});


	editors.forEach( function(item) {
		site.subsites[subsite].cards.push(item.getContents());
	});

	return site;
}
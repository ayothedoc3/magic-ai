$('#file').on('change', function () {
	'use strict';
	let isInvalid = false;
	const file = this.files[0];
	if (!file) return; // No file selected

	const allowedExtensions = ['mp3', 'mpeg', 'mpga', 'm4a', 'wav', 'ogg', 'webm', 'aac', 'flac'];
	const allowedMimes = [
		'audio/mpeg', 'audio/mp3', 'audio/x-m4a',
		'audio/wav', 'audio/webm', 'audio/ogg', 'audio/aac', 'audio/flac'
	];

	if (file.size > 24900000) { // ~25 MB
		toastr.error(magicai_localize?.file_size_exceed || 'This file exceeds the upload limit');
		isInvalid = true;
	}

	let mime = (file.type || '').toLowerCase();
	let name = file.name || '';
	let ext = '';

	// Try to extract a real extension
	if (name.includes('.')) {
		ext = name.split('.').pop().toLowerCase();
	} else {
		// Guess extension based on name keywords if missing
		const lowerName = name.toLowerCase();
		for (const candidate of allowedExtensions) {
			if (lowerName.includes(candidate)) {
				ext = candidate;
				break;
			}
		}
	}

	if (!allowedMimes.includes(mime) && !allowedExtensions.includes(ext)) {
		toastr.error(
			magicai_localize?.invalid_extension ||
			'Invalid audio file. Accepted: mp3, mpeg, mpga, m4a, wav, ogg, webm, aac, flac'
		);
		isInvalid = true;
	}

	if (!isInvalid && mime === 'video/webm') {
		toastr.error(
			magicai_localize?.invalid_extension ||
			'Video files are not allowed. Please upload an audio-only file.'
		);
		isInvalid = true;
	}

	// Reset input if invalid
	if (isInvalid) {
		this.value = null;
	}
});




// @formatter:off
document.addEventListener( 'DOMContentLoaded', function () {
	'use strict';

	var el = document.getElementById( 'language' );

	if (el) {
		window.TomSelect && ( new TomSelect( el, {
			copyClassesToDropdown: false,
			dropdownClass: 'dropdown-menu ts-dropdown',
			optionClass: 'dropdown-item',
			controlInput: '<input>',
			render: {
				item: function ( data, escape ) {
					if ( data.customProperties ) {
						return '<div><span class="dropdown-item-indicator">' + data.customProperties + '</span>' + escape( data.text ) + '</div>';
					}
					return '<div>' + escape( data.text ) + '</div>';
				},
				option: function ( data, escape ) {
					if ( data.customProperties ) {
						return '<div><span class="dropdown-item-indicator">' + data.customProperties + '</span>' + escape( data.text ) + '</div>';
					}
					return '<div>' + escape( data.text ) + '</div>';
				},
			},
		} ) );
	}

} );
// @formatter:on

function fillAnExample(selector){
	'use strict';

	const prompts = [
		'Cityscape at sunset in retro vector illustration',
		'Painting of a flower vase on a kitchen table with a window in the backdrop.',
		'Memphis style painting of a flower vase on a kitchen table with a window in the backdrop.',
		'Illustration of a cat sitting on a couch in a living room with a coffee mug in its hand.',
		'Delicious pizza with all the toppings.',
		'a super detailed infographic of a working time machine 8k',
		'hedgehog smelling a flower',
		'Freeform ferrofluids, beautiful dark chaos',
		'a home built in a huge Soap bubble, windows',
		'photo of an extremely cute alien fish swimming an alien habitable underwater planet'
	];

	var item = prompts[Math.floor(Math.random()*prompts.length)];

	$('.' + selector).val(item);

	return false;
}

/**
 * Haven property editor — Media Library pickers for the gallery and agent photo.
 * Loaded only on the property edit screen.
 */
(function ($) {
	'use strict';

	function syncGalleryInput($wrap) {
		var ids = $wrap
			.find('[data-haven-gallery-grid] .haven-gallery__item')
			.map(function () {
				return $(this).data('id');
			})
			.get();

		$wrap.find('[data-haven-gallery-input]').val(ids.join(','));
	}

	function galleryItem(attachment) {
		var url =
			attachment.sizes && attachment.sizes.thumbnail
				? attachment.sizes.thumbnail.url
				: attachment.url;

		return $(
			'<span class="haven-gallery__item" data-id="' +
				attachment.id +
				'"><img src="' +
				url +
				'" alt=""><button type="button" class="haven-gallery__remove" data-haven-gallery-remove aria-label="' +
				havenAdmin.removeLabel +
				'">&times;</button></span>'
		);
	}

	$(document).on('click', '[data-haven-gallery-add]', function (e) {
		e.preventDefault();

		var $wrap = $(this).closest('[data-haven-gallery]');
		var current = ($wrap.find('[data-haven-gallery-input]').val() || '')
			.split(',')
			.filter(Boolean);

		var frame = wp.media({
			title: havenAdmin.galleryTitle,
			button: { text: havenAdmin.galleryButton },
			library: { type: 'image' },
			multiple: 'add'
		});

		frame.on('open', function () {
			var selection = frame.state().get('selection');
			current.forEach(function (id) {
				var attachment = wp.media.attachment(id);
				attachment.fetch();
				selection.add(attachment ? [attachment] : []);
			});
		});

		frame.on('select', function () {
			var $grid = $wrap.find('[data-haven-gallery-grid]').empty();

			frame
				.state()
				.get('selection')
				.each(function (attachment) {
					$grid.append(galleryItem(attachment.toJSON()));
				});

			syncGalleryInput($wrap);
		});

		frame.open();
	});

	$(document).on('click', '[data-haven-gallery-remove]', function (e) {
		e.preventDefault();

		var $wrap = $(this).closest('[data-haven-gallery]');
		$(this).closest('.haven-gallery__item').remove();
		syncGalleryInput($wrap);
	});

	$(document).on('click', '[data-haven-image-select]', function (e) {
		e.preventDefault();

		var $wrap = $(this).closest('[data-haven-image]');

		var frame = wp.media({
			title: havenAdmin.imageTitle,
			button: { text: havenAdmin.imageButton },
			library: { type: 'image' },
			multiple: false
		});

		frame.on('select', function () {
			var attachment = frame.state().get('selection').first().toJSON();
			var url =
				attachment.sizes && attachment.sizes.thumbnail
					? attachment.sizes.thumbnail.url
					: attachment.url;

			$wrap.find('[data-haven-image-input]').val(attachment.id);
			$wrap
				.find('[data-haven-image-preview]')
				.html('<img src="' + url + '" alt="">');
		});

		frame.open();
	});

	$(document).on('click', '[data-haven-image-clear]', function (e) {
		e.preventDefault();

		var $wrap = $(this).closest('[data-haven-image]');
		$wrap.find('[data-haven-image-input]').val(0);
		$wrap.find('[data-haven-image-preview]').empty();
	});

	// Drag-to-reorder the gallery using jQuery UI sortable, which core ships.
	$(function () {
		if ($.fn.sortable) {
			$('[data-haven-gallery-grid]').sortable({
				items: '.haven-gallery__item',
				cursor: 'move',
				update: function () {
					syncGalleryInput($(this).closest('[data-haven-gallery]'));
				}
			});
		}
	});
})(jQuery);

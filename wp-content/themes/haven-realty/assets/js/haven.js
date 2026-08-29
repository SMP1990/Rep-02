/**
 * Haven Realty — progressive enhancement only.
 *
 * Every page renders, navigates, filters and submits without this file. What
 * it adds: the mobile menu, the filter disclosure, the gallery, favorites in
 * localStorage, the mortgage sliders and the video facade. No framework, no
 * dependencies, deferred, ~7KB unminified.
 */
(function () {
	'use strict';

	var STORAGE_KEY = 'haven:favorites';
	var i18n = (window.havenData && window.havenData.i18n) || {};

	/* ------------------------------------------------------------- helpers */

	function $(selector, scope) {
		return (scope || document).querySelector(selector);
	}

	function $$(selector, scope) {
		return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
	}

	function on(scope, event, selector, handler) {
		scope.addEventListener(event, function (e) {
			var target = e.target.closest(selector);

			if (target && scope.contains(target)) {
				handler(e, target);
			}
		});
	}

	/* --------------------------------------------------------------- toast */

	var toastEl = null;
	var toastTimer = null;

	function toast(message) {
		if (!toastEl) {
			toastEl = document.createElement('div');
			toastEl.className = 'toast';
			toastEl.setAttribute('role', 'status');
			toastEl.setAttribute('aria-live', 'polite');
			document.body.appendChild(toastEl);
		}

		toastEl.textContent = message;
		toastEl.classList.add('is-visible');

		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () {
			toastEl.classList.remove('is-visible');
		}, 2600);
	}

	/* ----------------------------------------------------------- favorites */

	function readFavorites() {
		try {
			var raw = window.localStorage.getItem(STORAGE_KEY);
			var parsed = raw ? JSON.parse(raw) : [];

			return Array.isArray(parsed) ? parsed.filter(Number.isFinite) : [];
		} catch (e) {
			// Private browsing, blocked storage — favorites just stay off.
			return [];
		}
	}

	function writeFavorites(ids) {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
		} catch (e) {
			/* Nothing to do — the button state below still reflects this session. */
		}
	}

	function updateFavoriteCount() {
		var badge = $('[data-haven-fav-count]');

		if (!badge) {
			return;
		}

		var count = readFavorites().length;

		badge.textContent = String(count);
		badge.hidden = count === 0;
	}

	function syncFavoriteButtons(scope) {
		var favorites = readFavorites();

		$$('[data-haven-fav]', scope).forEach(function (button) {
			var id = parseInt(button.getAttribute('data-haven-fav'), 10);
			var isSaved = favorites.indexOf(id) !== -1;

			button.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
			button.setAttribute('aria-label', isSaved ? i18n.unsave || 'Remove from favorites' : i18n.save || 'Save to favorites');
		});
	}

	function initFavorites() {
		syncFavoriteButtons(document);
		updateFavoriteCount();

		on(document, 'click', '[data-haven-fav]', function (e, button) {
			e.preventDefault();

			var id = parseInt(button.getAttribute('data-haven-fav'), 10);

			if (!Number.isFinite(id)) {
				return;
			}

			var favorites = readFavorites();
			var index = favorites.indexOf(id);

			if (index === -1) {
				favorites.push(id);
				toast(i18n.saved || 'Saved to favorites');
			} else {
				favorites.splice(index, 1);
				toast(i18n.removed || 'Removed from favorites');
			}

			writeFavorites(favorites);
			syncFavoriteButtons(document);
			updateFavoriteCount();

			// On the Saved page, drop the card straight out of the grid.
			var savedPage = $('[data-haven-saved]');

			if (savedPage && index !== -1) {
				var card = button.closest('.card');

				if (card) {
					card.remove();
					refreshSavedEmptyState();
				}
			}
		});
	}

	/* --------------------------------------------------------- saved page */

	function refreshSavedEmptyState() {
		var wrap = $('[data-haven-saved]');

		if (!wrap) {
			return;
		}

		var grid = $('[data-haven-saved-grid]', wrap);
		var empty = $('[data-haven-saved-empty]', wrap);
		var hasCards = grid && grid.children.length > 0;

		if (grid) {
			grid.hidden = !hasCards;
		}

		if (empty) {
			empty.hidden = hasCards;
		}
	}

	function initSavedPage() {
		var wrap = $('[data-haven-saved]');

		if (!wrap || !window.havenData || !window.havenData.favoritesEndpoint) {
			return;
		}

		var favorites = readFavorites();

		if (!favorites.length) {
			refreshSavedEmptyState();
			return;
		}

		var url = window.havenData.favoritesEndpoint + '?ids=' + encodeURIComponent(favorites.join(','));

		fetch(url, { credentials: 'same-origin' })
			.then(function (response) {
				if (!response.ok) {
					throw new Error('Request failed');
				}

				return response.json();
			})
			.then(function (data) {
				var grid = $('[data-haven-saved-grid]', wrap);

				if (grid && data.html) {
					grid.innerHTML = data.html;
					syncFavoriteButtons(grid);
				}

				refreshSavedEmptyState();
			})
			.catch(function () {
				refreshSavedEmptyState();
				toast(i18n.loadError || 'Could not load your saved properties.');
			});
	}

	/* --------------------------------------------------------------- share */

	function initShare() {
		on(document, 'click', '[data-haven-share]', function (e, button) {
			e.preventDefault();

			var url = button.getAttribute('data-url') || window.location.href;

			if (navigator.share) {
				navigator.share({ url: url }).catch(function () {
					/* User dismissed the sheet. */
				});
				return;
			}

			if (navigator.clipboard) {
				navigator.clipboard.writeText(url).then(function () {
					toast(i18n.copied || 'Property link copied');
				});
			}
		});
	}

	/* --------------------------------------------------------- mobile menu */

	function initMenu() {
		var toggle = $('[data-haven-menu-toggle]');
		var menu = $('#mobile-menu');

		if (!toggle || !menu) {
			return;
		}

		toggle.addEventListener('click', function () {
			var isOpen = toggle.getAttribute('aria-expanded') === 'true';

			toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
			menu.hidden = isOpen;
		});

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
				toggle.setAttribute('aria-expanded', 'false');
				menu.hidden = true;
				toggle.focus();
			}
		});
	}

	/* ------------------------------------------------------------- filters */

	function initFilters() {
		var toggle = $('[data-haven-filters-toggle]');
		var panel = $('#haven-advanced-filters');

		if (toggle && panel) {
			toggle.addEventListener('click', function () {
				var isOpen = toggle.getAttribute('aria-expanded') === 'true';

				toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
				panel.hidden = isOpen;
			});
		}

		// Sorting reloads immediately; the noscript submit button covers the rest.
		$$('[data-haven-autosubmit]').forEach(function (select) {
			select.addEventListener('change', function () {
				select.form.submit();
			});
		});

		// Amenity chips hide their checkbox, so mirror its state onto the label
		// for browsers that do not support :has().
		function syncChip(chip) {
			chip.classList.toggle('is-checked', chip.querySelector('input').checked);
		}

		$$('.chip').forEach(function (chip) {
			syncChip(chip);

			chip.querySelector('input').addEventListener('change', function () {
				syncChip(chip);
			});
		});
	}

	/* ------------------------------------------------------------- gallery */

	function initGallery() {
		var viewer = $('[data-haven-gallery-viewer]');

		if (!viewer) {
			return;
		}

		var slides = $$('.gallery__slide', viewer);
		var thumbs = $$('[data-haven-gallery-thumb]', viewer);
		var counter = $('[data-haven-gallery-current]', viewer);
		var index = 0;

		if (slides.length < 2) {
			return;
		}

		function show(next) {
			index = (next + slides.length) % slides.length;

			slides.forEach(function (slide, i) {
				slide.classList.toggle('is-active', i === index);
			});

			thumbs.forEach(function (thumb, i) {
				thumb.classList.toggle('is-active', i === index);
			});

			if (counter) {
				counter.textContent = String(index + 1);
			}
		}

		var prev = $('[data-haven-gallery-prev]', viewer);
		var next = $('[data-haven-gallery-next]', viewer);

		if (prev) {
			prev.addEventListener('click', function () {
				show(index - 1);
			});
		}

		if (next) {
			next.addEventListener('click', function () {
				show(index + 1);
			});
		}

		thumbs.forEach(function (thumb) {
			thumb.addEventListener('click', function () {
				show(parseInt(thumb.getAttribute('data-haven-gallery-thumb'), 10));
			});
		});

		viewer.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowLeft') {
				show(index - 1);
			} else if (e.key === 'ArrowRight') {
				show(index + 1);
			}
		});

		// Swipe on touch devices.
		var startX = null;

		viewer.addEventListener(
			'touchstart',
			function (e) {
				startX = e.changedTouches[0].clientX;
			},
			{ passive: true }
		);

		viewer.addEventListener(
			'touchend',
			function (e) {
				if (startX === null) {
					return;
				}

				var delta = e.changedTouches[0].clientX - startX;

				if (Math.abs(delta) > 45) {
					show(delta > 0 ? index - 1 : index + 1);
				}

				startX = null;
			},
			{ passive: true }
		);
	}

	/* ------------------------------------------------------------ mortgage */

	function initMortgage() {
		var panel = $('[data-haven-mortgage]');

		if (!panel) {
			return;
		}

		var price = parseFloat(panel.getAttribute('data-price'));
		var symbol = panel.getAttribute('data-symbol') || '$';

		if (!Number.isFinite(price) || price <= 0) {
			return;
		}

		var downInput = $('[data-haven-down]', panel);
		var rateInput = $('[data-haven-rate]', panel);
		var termInput = $('[data-haven-term]', panel);
		var downLabel = $('[data-haven-down-label]', panel);
		var downAmount = $('[data-haven-down-amount]', panel);
		var rateLabel = $('[data-haven-rate-label]', panel);
		var monthly = $('[data-haven-monthly]', panel);

		function money(value) {
			return symbol + Math.round(value).toLocaleString();
		}

		function recalculate() {
			var downPercent = parseFloat(downInput.value);
			var rate = parseFloat(rateInput.value);
			var years = parseInt(termInput.value, 10);

			var deposit = (price * downPercent) / 100;
			var principal = price - deposit;
			var monthlyRate = rate / 100 / 12;
			var payments = years * 12;

			var payment = monthlyRate === 0
				? principal / payments
				: (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -payments));

			downLabel.textContent = downPercent + '%';
			downAmount.textContent = money(deposit);
			rateLabel.textContent = rate + '%';
			monthly.textContent = money(payment);
		}

		[downInput, rateInput, termInput].forEach(function (input) {
			input.addEventListener('input', recalculate);
			input.addEventListener('change', recalculate);
		});

		recalculate();
	}

	/* --------------------------------------------------------------- video */

	function embedUrl(raw) {
		try {
			var url = new URL(raw);

			if (url.hostname.indexOf('youtu.be') !== -1) {
				return 'https://www.youtube-nocookie.com/embed' + url.pathname + '?autoplay=1';
			}

			if (url.hostname.indexOf('youtube.com') !== -1) {
				var id = url.searchParams.get('v');

				if (id) {
					return 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1';
				}
			}

			if (url.hostname.indexOf('vimeo.com') !== -1) {
				return 'https://player.vimeo.com/video' + url.pathname + '?autoplay=1';
			}
		} catch (e) {
			return null;
		}

		return null;
	}

	function initVideo() {
		on(document, 'click', '[data-haven-video]', function (e, button) {
			e.preventDefault();

			var src = embedUrl(button.getAttribute('data-haven-video'));

			if (!src) {
				return;
			}

			var modal = document.createElement('div');
			modal.className = 'video-modal';
			modal.innerHTML =
				'<div class="video-modal__frame">' +
				'<button class="video-modal__close" type="button" aria-label="Close">' +
				'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
				'</button>' +
				'<iframe src="" title="" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>' +
				'</div>';

			// Set the src after insertion so nothing from the video host is
			// requested until the visitor actually asks for it.
			document.body.appendChild(modal);
			$('iframe', modal).src = src;

			function close() {
				modal.remove();
				document.removeEventListener('keydown', onKey);
				button.focus();
			}

			function onKey(event) {
				if (event.key === 'Escape') {
					close();
				}
			}

			$('.video-modal__close', modal).addEventListener('click', close);

			modal.addEventListener('click', function (event) {
				if (event.target === modal) {
					close();
				}
			});

			document.addEventListener('keydown', onKey);
			$('.video-modal__close', modal).focus();
		});
	}

	/* ---------------------------------------------------------------- boot */

	function init() {
		initMenu();
		initFilters();
		initFavorites();
		initSavedPage();
		initShare();
		initGallery();
		initMortgage();
		initVideo();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();

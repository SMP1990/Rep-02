/**
 * Marketly — progressive enhancement only.
 *
 * Every page renders, navigates, searches and submits without this file. What
 * it adds is layered on top: the mobile drawer, the mini-cart, the wishlist,
 * the countdown and the carousels. No framework, no dependencies, deferred.
 *
 * Phase 1 establishes the shared plumbing: helpers, a module registry and a
 * toast. Feature modules register themselves in their own phases.
 */
(function () {
	'use strict';

	var data = window.marketlyData || {};
	var i18n = data.i18n || {};

	/* ------------------------------------------------------------- helpers */

	function $(selector, scope) {
		return (scope || document).querySelector(selector);
	}

	function $$(selector, scope) {
		return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
	}

	/**
	 * Delegated event binding, so markup replaced by AJAX keeps working
	 * without anything being re-bound.
	 */
	function on(scope, event, selector, handler) {
		(scope || document).addEventListener(event, function (e) {
			var target = e.target && e.target.closest ? e.target.closest(selector) : null;

			if (target && (scope || document).contains(target)) {
				handler(e, target);
			}
		});
	}

	function debounce(fn, wait) {
		var timer = null;

		return function () {
			var args = arguments;
			var self = this;

			clearTimeout(timer);
			timer = setTimeout(function () {
				fn.apply(self, args);
			}, wait || 200);
		};
	}

	/** Read JSON from a data attribute without throwing on malformed input. */
	function readJSON(raw, fallback) {
		if (!raw) {
			return fallback;
		}

		try {
			return JSON.parse(raw);
		} catch (err) {
			return fallback;
		}
	}

	/* --------------------------------------------------------------- toast */

	var toastEl = null;
	var toastTimer = null;

	/**
	 * Announce a short message. The live region is polite, so a screen reader
	 * hears it without having focus yanked away.
	 */
	function toast(message) {
		if (!message) {
			return;
		}

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

	/* ------------------------------------------------------------ focus trap */

	/**
	 * Keep Tab inside an open dialog or drawer, and restore focus to whatever
	 * opened it on close. Shared by the mobile drawer, mini-cart and search.
	 */
	function trapFocus(container) {
		var selector = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
		var opener = document.activeElement;

		function onKeydown(e) {
			if (e.key !== 'Tab') {
				return;
			}

			var items = $$(selector, container).filter(function (el) {
				return el.offsetParent !== null;
			});

			if (!items.length) {
				return;
			}

			var first = items[0];
			var last = items[items.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}

		container.addEventListener('keydown', onKeydown);

		return function release() {
			container.removeEventListener('keydown', onKeydown);

			if (opener && typeof opener.focus === 'function') {
				opener.focus();
			}
		};
	}

	/* ---------------------------------------------------------- module API */

	var modules = [];

	/**
	 * Register a feature module. Each runs once on ready, guarded so one
	 * broken module can never take the rest of the page down with it.
	 */
	function register(name, init) {
		modules.push({ name: name, init: init });
	}

	function boot() {
		modules.forEach(function (module) {
			try {
				module.init();
			} catch (err) {
				if (window.console && window.console.warn) {
					window.console.warn('Marketly module failed: ' + module.name, err);
				}
			}
		});
	}

	/* Expose the shared plumbing so later phases add features without
	   reopening this file. */
	window.Marketly = {
		$: $,
		$$: $$,
		on: on,
		debounce: debounce,
		readJSON: readJSON,
		toast: toast,
		trapFocus: trapFocus,
		register: register,
		data: data,
		i18n: i18n
	};

	/* ------------------------------------------------------------ wishlist */

	/**
	 * The wishlist is a per-browser list in localStorage. It needs no account,
	 * writes nothing to the database and costs no request — the trade-off
	 * being that it does not follow the shopper to another device.
	 *
	 * Every storage call is wrapped: Safari's private mode throws on write,
	 * and a thrown error here must never take the header down with it.
	 */
	var WISHLIST_KEY = 'marketly:wishlist';

	function wishlistRead() {
		try {
			var raw = window.localStorage.getItem(WISHLIST_KEY);
			var ids = readJSON(raw, []);

			return Array.isArray(ids) ? ids.filter(function (id) {
				return typeof id === 'number' && id > 0;
			}) : [];
		} catch (err) {
			return [];
		}
	}

	function wishlistWrite(ids) {
		try {
			window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
		} catch (err) {
			/* Storage unavailable or full — the page still works. */
		}
	}

	/** Paint every wishlist badge in the header and the tab bar. */
	function wishlistRender() {
		var count = wishlistRead().length;

		$$('[data-marketly-wishlist-count]').forEach(function (el) {
			el.textContent = count > 99 ? '99+' : String(count);
			el.hidden = count === 0;
		});

		document.dispatchEvent(new CustomEvent('marketly:wishlist', { detail: { count: count } }));
	}

	var wishlist = {
		all: wishlistRead,
		count: function () {
			return wishlistRead().length;
		},
		has: function (id) {
			return wishlistRead().indexOf(Number(id)) !== -1;
		},
		toggle: function (id) {
			var ids = wishlistRead();
			var at = ids.indexOf(Number(id));
			var added = at === -1;

			if (added) {
				ids.push(Number(id));
			} else {
				ids.splice(at, 1);
			}

			wishlistWrite(ids);
			wishlistRender();

			return added;
		}
	};

	register('wishlist-badge', function () {
		wishlistRender();

		// Keep a second tab in step — 'storage' fires only in other tabs.
		window.addEventListener('storage', function (e) {
			if (e.key === WISHLIST_KEY) {
				wishlistRender();
			}
		});
	});

	/* --------------------------------------------------------- panel helper */

	/**
	 * Wire an off-canvas panel: open, close, Escape, backdrop, focus trap and
	 * scroll lock. Shared by the navigation drawer and the mini cart so the
	 * two behave identically and the logic exists once.
	 */
	function setupPanel(options) {
		var panel = $(options.panel);

		if (!panel) {
			return null;
		}

		var release = null;
		var closing = null;
		var opener = null;

		function open(trigger) {
			clearTimeout(closing);
			opener = trigger || opener;
			panel.hidden = false;
			document.body.classList.add('is-locked');

			if (opener && opener.hasAttribute('aria-expanded')) {
				opener.setAttribute('aria-expanded', 'true');
			}

			// Next frame, so the transition has a start state to animate from.
			requestAnimationFrame(function () {
				panel.classList.add('is-open');
			});

			release = trapFocus(panel);

			var first = $('.drawer__close', panel);

			if (first) {
				first.focus();
			}
		}

		function close() {
			if (panel.hidden) {
				return;
			}

			panel.classList.remove('is-open');
			document.body.classList.remove('is-locked');

			if (opener && opener.hasAttribute('aria-expanded')) {
				opener.setAttribute('aria-expanded', 'false');
			}

			// Let the slide-out finish before removing it from the a11y tree.
			closing = setTimeout(function () {
				panel.hidden = true;
			}, 220);

			if (release) {
				release();
				release = null;
			}
		}

		on(panel, 'click', options.closeSelector, close);

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && !panel.hidden) {
				close();
			}
		});

		if (options.closeOnDesktop) {
			// A panel left open across a resize into the desktop layout would
			// be hidden by CSS but still holding the scroll lock.
			window.addEventListener('resize', debounce(function () {
				if (window.matchMedia('(min-width: 64em)').matches) {
					close();
				}
			}, 150));
		}

		return { open: open, close: close, el: panel };
	}

	/* -------------------------------------------------------------- drawer */

	register('drawer', function () {
		var opener = $('[data-marketly-drawer-open]');

		var drawer = setupPanel({
			panel: '#marketly-drawer',
			closeSelector: '[data-marketly-drawer-close]',
			closeOnDesktop: true
		});

		if (!drawer || !opener) {
			return;
		}

		// The hamburger ships hidden and is revealed here, so a visitor
		// without JavaScript is never shown a control that does nothing.
		opener.hidden = false;

		opener.addEventListener('click', function () {
			drawer.open(opener);
		});
	});

	/* ----------------------------------------------------------- mini cart */

	register('minicart', function () {
		var cart = setupPanel({
			panel: '#marketly-minicart',
			closeSelector: '[data-marketly-minicart-close]',
			closeOnDesktop: false
		});

		if (!cart) {
			return;
		}

		// The header icon stays a real link to the cart page. Intercepting the
		// click keeps it working with scripting off, and modified clicks
		// (new tab, middle button) are left alone deliberately.
		on(document, 'click', '.action--cart', function (e, link) {
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
				return;
			}

			e.preventDefault();
			cart.open(link);
		});

		// WooCommerce announces a successful AJAX add over jQuery, which it
		// has already loaded on these pages. jQuery's custom events do not
		// reach addEventListener, so this listens the same way rather than
		// adding jQuery of its own.
		if (window.jQuery) {
			window.jQuery(document.body).on('added_to_cart', function () {
				cart.open();
			});
		}
	});

	/* ------------------------------------------------------ wishlist toggle */

	register('wishlist-toggle', function () {
		var buttons = $$('[data-marketly-fav]');

		if (!buttons.length) {
			return;
		}

		/** Reflect stored state onto every card on the page. */
		function paint() {
			$$('[data-marketly-fav]').forEach(function (btn) {
				btn.setAttribute('aria-pressed', wishlist.has(btn.dataset.productId) ? 'true' : 'false');
			});
		}

		paint();

		on(document, 'click', '[data-marketly-fav]', function (e, btn) {
			e.preventDefault();

			var id = Number(btn.dataset.productId);

			if (!id) {
				return;
			}

			var added = wishlist.toggle(id);

			btn.setAttribute('aria-pressed', added ? 'true' : 'false');
			toast(added ? i18n.added : i18n.removed);

			// The same product can appear in more than one shelf.
			paint();
		});

		document.addEventListener('marketly:wishlist', paint);
	});

	/* ----------------------------------------------------------- countdown */

	register('countdown', function () {
		var timers = $$('[data-marketly-countdown]');

		if (!timers.length) {
			return;
		}

		function pad(n) {
			return n < 10 ? '0' + n : String(n);
		}

		function tick() {
			var live = 0;

			timers.forEach(function (timer) {
				var deadline = Date.parse(timer.dataset.deadline);

				if (isNaN(deadline)) {
					return;
				}

				var left = Math.max(0, Math.floor((deadline - Date.now()) / 1000));

				if (left <= 0) {
					// The offer is over. Removing the whole band beats leaving
					// a row of zeroes advertising an expired deal; the server
					// will not render it on the next load either.
					var section = timer.closest('.deal');

					if (section) {
						section.hidden = true;
					}

					return;
				}

				live++;

				var parts = {
					days: Math.floor(left / 86400),
					hours: Math.floor((left % 86400) / 3600),
					minutes: Math.floor((left % 3600) / 60),
					seconds: left % 60
				};

				Object.keys(parts).forEach(function (unit) {
					var el = timer.querySelector('[data-unit="' + unit + '"]');
					var next = pad(parts[unit]);

					// Only touch the DOM when the digits actually change.
					if (el && el.textContent !== next) {
						el.textContent = next;
					}
				});
			});

			if (live > 0) {
				window.setTimeout(tick, 1000);
			}
		}

		tick();
	});

	/* -------------------------------------------------------- testimonials */

	register('testimonials', function () {
		var rail = $('[data-marketly-testimonials]');
		var dots = $$('[data-marketly-tmdot]');

		if (!rail || !dots.length) {
			return;
		}

		var slides = Array.prototype.slice.call(rail.children);

		function select(index) {
			dots.forEach(function (dot, i) {
				var current = i === index;

				dot.classList.toggle('is-current', current);

				// aria-current, not aria-selected: these are buttons in a
				// group, not tabs owning panels.
				if (current) {
					dot.setAttribute('aria-current', 'true');
				} else {
					dot.removeAttribute('aria-current');
				}
			});
		}

		dots.forEach(function (dot, i) {
			dot.addEventListener('click', function () {
				if (slides[i]) {
					// scrollLeft rather than scrollIntoView, which would also
					// scroll the page vertically to reach the rail.
					rail.scrollTo({ left: slides[i].offsetLeft - rail.offsetLeft, behavior: 'smooth' });
				}

				select(i);
			});
		});

		// Keep the dots in step when the rail is swiped instead of tapped.
		rail.addEventListener('scroll', debounce(function () {
			var middle = rail.scrollLeft + (rail.clientWidth / 2);
			var nearest = 0;
			var best = Infinity;

			slides.forEach(function (slide, i) {
				var centre = slide.offsetLeft - rail.offsetLeft + (slide.clientWidth / 2);
				var distance = Math.abs(centre - middle);

				if (distance < best) {
					best = distance;
					nearest = i;
				}
			});

			select(nearest);
		}, 90));
	});

	/* ------------------------------------------------------- wishlist page */

	register('wishlist-page', function () {
		var target = $('[data-marketly-wishlist-page]');
		var empty = $('[data-marketly-wishlist-empty]');

		if (!target) {
			return;
		}

		function showEmpty() {
			target.innerHTML = '';
			target.setAttribute('aria-busy', 'false');

			if (empty) {
				empty.hidden = false;
			}
		}

		var ids = wishlist.all();

		if (!ids.length) {
			showEmpty();
			return;
		}

		var url = (data.restUrl || '') + 'wishlist?ids=' + encodeURIComponent(ids.join(','));

		fetch(url, { credentials: 'same-origin' })
			.then(function (res) {
				if (!res.ok) {
					throw new Error('HTTP ' + res.status);
				}

				return res.json();
			})
			.then(function (payload) {
				if (!payload || !payload.count) {
					showEmpty();
					return;
				}

				target.innerHTML = payload.html;
				target.classList.add('grid', 'pcols');
				target.setAttribute('aria-busy', 'false');

				if (empty) {
					empty.hidden = true;
				}

				// Drop ids the store no longer has — deleted, unpublished or
				// hidden — so the list does not quietly rot.
				if (Array.isArray(payload.found) && payload.found.length !== ids.length) {
					wishlistWrite(ids.filter(function (id) {
						return payload.found.indexOf(id) !== -1;
					}));
					wishlistRender();
				}

				document.dispatchEvent(new CustomEvent('marketly:wishlist'));
			})
			.catch(function () {
				// The saved list is intact; only this render failed.
				target.setAttribute('aria-busy', 'false');
				target.innerHTML = '';

				var note = document.createElement('p');
				note.className = 'notice-inline notice-inline--error';
				note.textContent = i18n.loadError || 'Could not load your saved products.';
				target.appendChild(note);
			});
	});

	/* Expose the shared plumbing so later phases add features without
	   reopening this file. */
	window.Marketly.wishlist = wishlist;

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();

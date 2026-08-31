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

	/* -------------------------------------------------------------- drawer */

	register('drawer', function () {
		var drawer = $('#marketly-drawer');
		var opener = $('[data-marketly-drawer-open]');

		if (!drawer || !opener) {
			return;
		}

		// The hamburger ships hidden and is revealed here, so a visitor
		// without JavaScript is never shown a control that does nothing.
		opener.hidden = false;

		var release = null;
		var closing = null;

		function open() {
			clearTimeout(closing);
			drawer.hidden = false;
			document.body.classList.add('is-locked');
			opener.setAttribute('aria-expanded', 'true');

			// Next frame, so the transition has a start state to animate from.
			requestAnimationFrame(function () {
				drawer.classList.add('is-open');
			});

			release = trapFocus(drawer);

			var first = $('.drawer__close', drawer);
			if (first) {
				first.focus();
			}
		}

		function close() {
			if (drawer.hidden) {
				return;
			}

			drawer.classList.remove('is-open');
			document.body.classList.remove('is-locked');
			opener.setAttribute('aria-expanded', 'false');

			// Let the slide-out finish before removing it from the a11y tree.
			closing = setTimeout(function () {
				drawer.hidden = true;
			}, 220);

			if (release) {
				release();
				release = null;
			}
		}

		opener.addEventListener('click', open);

		on(drawer, 'click', '[data-marketly-drawer-close]', close);

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && !drawer.hidden) {
				close();
			}
		});

		// A drawer left open across a resize into the desktop layout would be
		// hidden by CSS but still holding the scroll lock.
		window.addEventListener('resize', debounce(function () {
			if (window.matchMedia('(min-width: 64em)').matches) {
				close();
			}
		}, 150));
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
				dot.setAttribute('aria-selected', current ? 'true' : 'false');
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

	/* Expose the shared plumbing so later phases add features without
	   reopening this file. */
	window.Marketly.wishlist = wishlist;

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();

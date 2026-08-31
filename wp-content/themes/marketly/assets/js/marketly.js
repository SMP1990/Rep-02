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

	/* Expose the shared plumbing so later phases add features without
	   reopening this file. */
	window.Marketly.wishlist = wishlist;

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();

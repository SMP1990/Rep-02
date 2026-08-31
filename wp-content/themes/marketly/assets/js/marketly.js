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

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();

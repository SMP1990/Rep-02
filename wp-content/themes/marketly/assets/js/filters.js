/**
 * Catalogue filters.
 *
 * Everything here is an enhancement over a form that already works. The
 * panel is a <form method="get">; without this file it submits, the server
 * filters, the page reloads and the visitor gets exactly the right results.
 * What this adds is that the results are swapped in place instead, that the
 * URL is kept in step so the back button and a copied link both behave, and
 * that on narrow screens the panel becomes a drawer.
 *
 * The consequence of that ordering: if any of this throws, the form is still
 * a form. Nothing below removes the submit path or the links behind a chip.
 *
 * @package Marketly
 */

(function () {
	'use strict';

	var M = window.Marketly;
	var config = window.marketlyFilters || {};
	var i18n = config.i18n || {};

	if (!M || !config.endpoint) {
		return;
	}

	var $ = M.$;
	var $$ = M.$$;

	/* --------------------------------------------------------------- state */

	var panel = null;
	var results = null;
	var scrim = null;
	var request = 0;
	var releaseFocus = null;

	function el(selector, scope) {
		return $(selector, scope || document);
	}

	/**
	 * Read the panel's controls into the query string the server expects.
	 *
	 * Built from the form itself rather than from a state object kept
	 * alongside it, so what is sent is always what the visitor can see. The
	 * price inputs are dropped when they sit on the ends of the range: a
	 * range covering everything is not a filter, and sending it would put a
	 * meaningless argument in the URL.
	 */
	function readForm(form) {
		var data = new FormData(form);
		var params = new URLSearchParams();
		var price = el('[data-cf-price]', form);
		var bounds = price
			? { min: parseFloat(price.dataset.min), max: parseFloat(price.dataset.max) }
			: null;

		data.forEach(function (value, key) {
			if (typeof value !== 'string' || value === '') {
				return;
			}

			// Radios whose value is the "no filter" choice.
			if ((key === 'rating' || key === 'discount') && parseFloat(value) === 0) {
				return;
			}

			if (bounds && key === 'price_min' && parseFloat(value) <= bounds.min) {
				return;
			}

			if (bounds && key === 'price_max' && parseFloat(value) >= bounds.max) {
				return;
			}

			// brand[] and tag[] arrive repeated; the server reads either form,
			// and a comma-joined value keeps the URL short and readable.
			if (key === 'brand[]' || key === 'tag[]') {
				var flat = key.slice(0, -2);
				var seen = params.get(flat);

				params.set(flat, seen ? seen + ',' + value : value);
				return;
			}

			params.set(key, value);
		});

		return params;
	}

	/* ------------------------------------------------------------ fetching */

	/**
	 * Ask the server for a filtered page and swap it in.
	 *
	 * Responses are stamped with the request they answer, so a slow reply to
	 * an abandoned filter can never overwrite the results of a later one —
	 * the failure that makes a filter feel haunted.
	 */
	function refresh(form, options) {
		options = options || {};

		var params = readForm(form);
		var base = form.dataset.base || '';
		var mine = ++request;

		if (options.paged && options.paged > 1) {
			params.set('paged', String(options.paged));
		}

		params.set('base', base);

		// The storefront shelf asks for a bare grid; the catalogue asks for
		// the whole region, toolbar and pagination included.
		if (results && results.dataset.view) {
			params.set('view', results.dataset.view);
		}

		if (results) {
			results.setAttribute('aria-busy', 'true');
		}

		window
			.fetch(config.endpoint + '?' + params.toString(), {
				headers: { Accept: 'application/json' },
				credentials: 'same-origin'
			})
			.then(function (response) {
				if (!response.ok) {
					throw new Error('HTTP ' + response.status);
				}

				return response.json();
			})
			.then(function (payload) {
				if (mine !== request) {
					return;
				}

				apply(payload, options);
			})
			.catch(function () {
				if (mine !== request) {
					return;
				}

				if (results) {
					results.setAttribute('aria-busy', 'false');
				}

				if (M.toast && i18n.error) {
					M.toast(i18n.error);
				}
			});
	}

	/**
	 * Put a response on the page.
	 */
	function apply(payload, options) {
		if (results && typeof payload.html === 'string') {
			results.innerHTML = payload.html;
			results.setAttribute('aria-busy', 'false');
		}

		// The panel is replaced too, because its counts describe the results
		// that have just landed. Which section was open, where the list was
		// scrolled and what has focus all have to survive that.
		//
		// The storefront strip is not that panel and gets no replacement:
		// swapping it would put the catalogue's full sidebar in the middle of
		// the front page.
		if (panel && payload.panel) {
			replacePanel(payload.panel);
		}

		if (payload.url && window.history && window.history.pushState) {
			window.history.pushState({ marketly: true }, '', payload.url);
		}

		if (options.scroll && results) {
			results.scrollIntoView({
				behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
					? 'auto'
					: 'smooth',
				block: 'start'
			});
		}

		announce(payload.total);
		paintChips();
	}

	/**
	 * Swap the panel's markup while keeping the visitor's place in it.
	 */
	function replacePanel(html) {
		var open = panel.classList.contains('is-open');
		var focused = document.activeElement;
		var focusKey = focused && panel.contains(focused) ? fingerprint(focused) : null;
		var scrolled = el('.cfilter__scroll', panel);
		var offset = scrolled ? scrolled.scrollTop : 0;

		// Which disclosures the visitor had opened, by their aria-controls.
		var expanded = $$('.cfsec__toggle', panel)
			.filter(function (button) {
				return button.getAttribute('aria-expanded') === 'true';
			})
			.map(function (button) {
				return button.getAttribute('aria-controls');
			});

		var host = document.createElement('div');

		host.innerHTML = html;

		var fresh = el('[data-marketly-filter]', host);

		if (!fresh) {
			return;
		}

		panel.replaceWith(fresh);
		panel = fresh;

		if (open) {
			panel.classList.add('is-open');
		}

		$$('.cfsec__toggle', panel).forEach(function (button) {
			var id = button.getAttribute('aria-controls');
			var body = document.getElementById(id);

			if (!body) {
				return;
			}

			var shouldOpen = expanded.indexOf(id) !== -1;

			button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
			body.hidden = !shouldOpen;
		});

		var newScroll = el('.cfilter__scroll', panel);

		if (newScroll) {
			newScroll.scrollTop = offset;
		}

		if (focusKey) {
			var target = el('[data-cf-key="' + focusKey + '"]', panel) || findByFingerprint(focusKey);

			if (target && typeof target.focus === 'function') {
				target.focus({ preventScroll: true });
			}
		}

		paintPrice();
	}

	/**
	 * A stable identifier for a control, so focus can be restored to the same
	 * one after the panel is redrawn.
	 */
	function fingerprint(node) {
		if (node.id) {
			return '#' + node.id;
		}

		if (node.name) {
			return node.name + '=' + (node.value || '');
		}

		if (node.getAttribute('aria-controls')) {
			return 'ctl:' + node.getAttribute('aria-controls');
		}

		return null;
	}

	function findByFingerprint(key) {
		if (key.charAt(0) === '#') {
			return el(key, panel);
		}

		if (key.indexOf('ctl:') === 0) {
			return el('[aria-controls="' + key.slice(4) + '"]', panel);
		}

		var split = key.indexOf('=');

		if (split === -1) {
			return null;
		}

		return el(
			'[name="' + key.slice(0, split) + '"][value="' + key.slice(split + 1) + '"]',
			panel
		);
	}

	/** Tell a screen reader how many results the change produced. */
	function announce(total) {
		var message;

		if (total === 0) {
			message = i18n.none;
		} else if (total === 1) {
			message = i18n.one;
		} else if (i18n.results) {
			message = i18n.results.replace('%s', String(total));
		}

		var live = el('[data-cf-total]', panel);

		if (live && message) {
			live.textContent = message;
		}
	}

	/**
	 * Mirror the form's own state onto the controls that show it.
	 *
	 * The chips and tags are styled from a class rather than from :checked
	 * alone, because each also carries a colour of its own; and the drawer
	 * trigger sits outside the panel, so a panel swap never reaches it.
	 */
	function paintChips() {
		if (!panel) {
			return;
		}

		$$('.cfchip, .cftag', panel).forEach(function (label) {
			var input = label.querySelector('input');

			if (input) {
				label.classList.toggle('is-on', input.checked);
			}
		});

		var count = countActive();

		$$('[data-cf-badge]').forEach(function (badge) {
			badge.textContent = String(count);
			badge.hidden = count === 0;
		});

		var reset = el('.cfilter__reset', panel);

		if (reset) {
			reset.classList.toggle('is-hidden', count === 0);
		}
	}

	/**
	 * How many choices the form currently holds.
	 *
	 * Counted from the controls rather than from the URL, so the number is
	 * right in the moment between a click and the response arriving.
	 */
	function countActive() {
		var params = readForm(panel);
		var count = 0;

		params.forEach(function (value, key) {
			if (key === 'brand' || key === 'tag') {
				count += value.split(',').filter(Boolean).length;
			} else if (key !== 'orderby' && key !== 'price_max') {
				count += 1;
			}
		});

		return count;
	}

	/* -------------------------------------------------------- price slider */

	/**
	 * Keep the two range handles, the number fields and the filled section of
	 * the track describing the same range.
	 *
	 * The handles cannot cross: pushing the lower one past the upper clamps
	 * it, which is less surprising than letting the range invert and quietly
	 * swapping the values behind the visitor's back.
	 */
	function paintPrice() {
		var wrap = el('[data-cf-price]', panel);

		if (!wrap) {
			return;
		}

		var low = el('[data-cf-price-min]', wrap);
		var high = el('[data-cf-price-max]', wrap);
		var fill = el('[data-cf-price-fill]', wrap);
		var min = parseFloat(wrap.dataset.min);
		var max = parseFloat(wrap.dataset.max);

		if (!low || !high || max <= min) {
			return;
		}

		var a = parseFloat(low.value);
		var b = parseFloat(high.value);

		if (a > b) {
			a = b;
			low.value = String(a);
		}

		if (fill) {
			var start = ((a - min) / (max - min)) * 100;
			var end = ((b - min) / (max - min)) * 100;

			fill.style.insetInlineStart = start + '%';
			fill.style.width = Math.max(0, end - start) + '%';
		}

		// The upper handle sits on top, so a drag that starts on the far left
		// would grab it rather than the lower one. Handing the left half of
		// the track to the lower input fixes that without a custom widget.
		var midpoint = (a + b) / 2;
		var pivot = ((midpoint - min) / (max - min)) * 100;

		low.style.clipPath = 'inset(0 ' + (100 - pivot) + '% 0 0)';
		high.style.clipPath = 'inset(0 0 0 ' + pivot + '%)';
	}

	/**
	 * Move the number fields to match the handles.
	 */
	function syncPriceFields() {
		var wrap = el('[data-cf-price]', panel);

		if (!wrap) {
			return;
		}

		var low = el('[data-cf-price-min]', wrap);
		var high = el('[data-cf-price-max]', wrap);
		var from = el('[data-cf-price-from]', wrap);
		var to = el('[data-cf-price-to]', wrap);

		if (low && from) {
			from.value = low.value;
		}

		if (high && to) {
			to.value = high.value;
		}
	}

	/**
	 * Move the handles to match the number fields.
	 */
	function syncPriceHandles() {
		var wrap = el('[data-cf-price]', panel);

		if (!wrap) {
			return;
		}

		var low = el('[data-cf-price-min]', wrap);
		var high = el('[data-cf-price-max]', wrap);
		var from = el('[data-cf-price-from]', wrap);
		var to = el('[data-cf-price-to]', wrap);
		var min = parseFloat(wrap.dataset.min);
		var max = parseFloat(wrap.dataset.max);

		function clamp(value, fallback) {
			var number = parseFloat(value);

			if (isNaN(number)) {
				return fallback;
			}

			return Math.min(max, Math.max(min, number));
		}

		if (low && from) {
			low.value = String(clamp(from.value, min));
		}

		if (high && to) {
			high.value = String(clamp(to.value, max));
		}

		paintPrice();
	}

	/* -------------------------------------------------------------- drawer */

	function openPanel(trigger) {
		if (!panel) {
			return;
		}

		scrim = document.createElement('div');
		scrim.className = 'cfscrim';
		document.body.appendChild(scrim);

		// One frame before adding the class, or the transition has nothing to
		// animate from and the scrim simply appears.
		window.requestAnimationFrame(function () {
			if (scrim) {
				scrim.classList.add('is-open');
			}
		});

		scrim.addEventListener('click', function () {
			closePanel(trigger);
		});

		panel.classList.add('is-open');
		document.body.style.overflow = 'hidden';

		if (trigger) {
			trigger.setAttribute('aria-expanded', 'true');
		}

		if (M.trapFocus) {
			releaseFocus = M.trapFocus(panel);
		}

		// The closed panel is visibility:hidden, which is what keeps its
		// controls out of the tab order — and also what stops focus landing
		// on them. One frame is not enough: the class is applied in this
		// frame and only takes effect in the style pass for the next, so the
		// move has to wait for the frame after that.
		window.requestAnimationFrame(function () {
			window.requestAnimationFrame(function () {
				var close = el('[data-cf-close]', panel);

				if (close) {
					close.focus();
				}
			});
		});
	}

	function closePanel(trigger) {
		if (!panel) {
			return;
		}

		panel.classList.remove('is-open');
		document.body.style.overflow = '';

		if (scrim) {
			scrim.remove();
			scrim = null;
		}

		if (releaseFocus) {
			releaseFocus();
			releaseFocus = null;
		}

		if (trigger) {
			trigger.setAttribute('aria-expanded', 'false');
			trigger.focus();
		}
	}

	function isDrawer() {
		return window.matchMedia('(max-width: 63.99em)').matches;
	}

	/* ------------------------------------------------------------- wiring */

	M.register('catalogue-filter', function () {
		panel = el('[data-marketly-filter]');
		results = el('[data-marketly-results]');

		if (!panel) {
			return;
		}

		var trigger = el('[data-cf-open]');

		/* The drawer. */

		if (trigger) {
			trigger.addEventListener('click', function () {
				if (panel.classList.contains('is-open')) {
					closePanel(trigger);
				} else {
					openPanel(trigger);
				}
			});
		}

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape' && panel.classList.contains('is-open')) {
				closePanel(trigger);
			}
		});

		// Growing past the drawer breakpoint with the drawer open would leave
		// the body scroll-locked behind a sidebar that is simply part of the
		// page again.
		window.addEventListener('resize', M.debounce(function () {
			if (!isDrawer() && panel.classList.contains('is-open')) {
				closePanel(trigger);
			}
		}, 150));

		/* Disclosures. Delegated, so a replaced panel keeps working. */

		document.addEventListener('click', function (event) {
			var toggle = event.target.closest ? event.target.closest('.cfsec__toggle') : null;

			if (!toggle || !panel.contains(toggle)) {
				return;
			}

			var body = document.getElementById(toggle.getAttribute('aria-controls'));

			if (!body) {
				return;
			}

			var open = toggle.getAttribute('aria-expanded') === 'true';

			toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
			body.hidden = open;

			if (!open) {
				paintPrice();
			}
		});

		/* Every control refreshes the results when it changes.

		   On the desktop sidebar that happens straight away, which is what
		   makes the counts worth showing. In the drawer it also happens
		   straight away — the results are behind the drawer and the footer
		   button's count updates — so closing the drawer never reveals a
		   surprise. */

		var queueRefresh = M.debounce(function (scroll) {
			refresh(panel, { scroll: scroll === true });
		}, 220);

		/* These listen on the document rather than on the panel, because the
		   panel element itself is replaced on every refresh — anything bound
		   directly to it stops firing after the first swap. */

		document.addEventListener('change', function (event) {
			var target = event.target;

			if (!panel.contains(target)) {
				return;
			}

			// The two range handles carry no name — the number fields beside
			// them are what the form submits — so they have to be admitted
			// on their type instead of being skipped as nameless.
			if (!target.name && target.type !== 'range' && target.dataset.cfRatingShortcut === undefined) {
				return;
			}

			// The quick 4.5-star chip is a shortcut to the Rating section's
			// radios, not a filter of its own: it sets them, so the two can
			// never show different answers.
			if (target.dataset.cfRatingShortcut !== undefined) {
				var wanted = target.checked ? '4.5' : '0';

				$$('[data-cf-rating]', panel).forEach(function (radio) {
					radio.checked = radio.value === wanted;
				});
			}

			// The quick chips and the Availability switches are the same four
			// filters twice over; keep the pair in step.
			if (target.name && ['sale', 'top', 'instock', 'featured'].indexOf(target.name) !== -1) {
				$$('[name="' + target.name + '"]', panel).forEach(function (box) {
					if (box !== target) {
						box.checked = target.checked;
					}
				});
			}

			paintChips();

			if (target.type === 'range') {
				paintPrice();
				syncPriceFields();
			}

			if (target.classList.contains('cfprice__input')) {
				syncPriceHandles();
			}

			queueRefresh();
		});

		// Dragging a slider fires input continuously and change only on
		// release: paint on every input so the track follows the thumb, but
		// leave the request to change so a drag is one query, not fifty.
		document.addEventListener('input', function (event) {
			if (panel.contains(event.target) && event.target.type === 'range') {
				paintPrice();
				syncPriceFields();
			}
		});

		/* The form still submits when there is no script path — but there is
		   one here, so intercept it and swap instead. */

		document.addEventListener('submit', function (event) {
			if (event.target !== panel) {
				return;
			}

			event.preventDefault();
			refresh(panel, { scroll: true });

			if (isDrawer()) {
				closePanel(trigger);
			}
		});

		/* Reset. The link's href is already the unfiltered catalogue, so
		   letting it navigate is a correct fallback; intercepting it just
		   avoids the reload. */

		document.addEventListener('click', function (event) {
			var reset = event.target.closest ? event.target.closest('[data-cf-reset]') : null;

			if (!reset) {
				return;
			}

			event.preventDefault();
			panel.reset();

			// reset() restores the markup's checked attributes, which for a
			// filtered page are the filters themselves. Clearing by hand is
			// what actually empties the form.
			$$('input', panel).forEach(function (input) {
				if (input.type === 'checkbox' || input.type === 'radio') {
					input.checked = input.value === '' || parseFloat(input.value) === 0;
				} else if (input.type === 'number' || input.type === 'search') {
					input.value = '';
				}
			});

			var wrap = el('[data-cf-price]', panel);

			if (wrap) {
				var low = el('[data-cf-price-min]', wrap);
				var high = el('[data-cf-price-max]', wrap);

				if (low) {
					low.value = wrap.dataset.min;
				}

				if (high) {
					high.value = wrap.dataset.max;
				}

				paintPrice();
			}

			paintChips();
			refresh(panel, { scroll: true });

			if (isDrawer()) {
				closePanel(trigger);
			}
		});

		/* Brand search. Filters the list that is already on the page — no
		   request, and no waiting to see whether a brand exists. */

		document.addEventListener('input', function (event) {
			var search = event.target.closest ? event.target.closest('[data-cf-brand-search]') : null;

			if (!search) {
				return;
			}

			var needle = search.value.trim().toLowerCase();
			var list = el('[data-cf-brand-list]', panel);
			var none = el('[data-cf-brand-none]', panel);
			var shown = 0;

			if (!list) {
				return;
			}

			$$('li', list).forEach(function (row) {
				var name = row.dataset.cfName || '';
				var match = !needle || name.indexOf(needle) !== -1;

				row.hidden = !match;

				if (match) {
					shown += 1;
				}
			});

			if (none) {
				none.hidden = shown !== 0;
			}
		});

		/* Pagination inside the swapped region. */

		document.addEventListener('click', function (event) {
			if (!results) {
				return;
			}

			var link = event.target.closest ? event.target.closest('.woocommerce-pagination a') : null;

			if (!link || !results.contains(link)) {
				return;
			}

			var paged = pagedFrom(link.href);

			if (!paged) {
				return;
			}

			event.preventDefault();
			refresh(panel, { paged: paged, scroll: true });
		});

		/* The back button. Reloading is the honest answer: the previous entry
		   is a full catalogue URL and the server renders it correctly. */

		window.addEventListener('popstate', function (event) {
			if (event.state && event.state.marketly) {
				window.location.reload();
			}
		});

		paintPrice();
	});

	/**
	 * The page number in a WooCommerce pagination link, pretty or plain.
	 */
	function pagedFrom(href) {
		var pretty = href.match(/\/page\/(\d+)/);

		if (pretty) {
			return parseInt(pretty[1], 10);
		}

		var plain = href.match(/[?&]paged?=(\d+)/);

		return plain ? parseInt(plain[1], 10) : 0;
	}
})();

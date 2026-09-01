# Rep-02 — WordPress projects

This repository holds two independent, self-contained WordPress projects. They
share nothing and are installed separately.

| Project | What it is | Where |
|---|---|---|
| **Marketly** | A WooCommerce storefront theme + companion plugin. **In development.** | `wp-content/themes/marketly`, `wp-content/plugins/marketly-core` |
| **Haven Realty Group** | A finished luxury real-estate site. | `wp-content/themes/haven-realty`, `wp-content/plugins/haven-realty-core` |

---

# Marketly — WooCommerce storefront

A hand-built WooCommerce theme following the Underscores (`_s`) template
hierarchy. No page builder, no CSS framework, no build step, no SEO plugin.

**Status: complete.** Built in seven phases; see the git history for each.

```
wp-content/
├── plugins/marketly-core/          Data layer (survives a theme switch)
│   ├── marketly-core.php           Bootstrap, activation, include loader
│   └── includes/
│       ├── functions.php           IP throttling + honeypot helpers
│       ├── class-marketly-testimonials.php  Testimonial post type + meta
│       ├── class-marketly-subscribers.php   Newsletter store (private CPT)
│       └── class-marketly-forms.php         Nonce + honeypot + rate limit
│
└── themes/marketly/                Presentation layer
    ├── style.css                   Theme header only
    ├── functions.php               Setup, enqueues, image sizes, menus
    ├── inc/setup.php               Dependency guards, head trimming, first run
    ├── inc/template-helpers.php    Inline SVG icons, ratings, section headings
    ├── inc/customizer.php          Panel, defaults registry, sanitisers
    ├── inc/customizer-storefront.php  Hero, deal, shelves, promos, newsletter
    ├── inc/seo.php                 Meta, canonical, OG, JSON-LD (plugin-safe)
    ├── inc/storefront.php          Live WooCommerce queries + homepage hooks
    ├── inc/woocommerce.php         Woo hooks, assets, fragments, wishlist API
    ├── front-page.php              The storefront homepage
    ├── template-wishlist.php       Wishlist page template
    ├── template-deals.php          On-sale products with pagination
    ├── woocommerce/
    │   └── content-product.php     The theme's ONLY Woo template override
    ├── inc/header-footer.php       Hooks the header/footer parts into place
    ├── header.php  footer.php      Page shell; fires three actions, no markup
    ├── index.php  archive.php  page.php  single.php  search.php  404.php
    ├── searchform.php  comments.php
    ├── template-parts/
    │   ├── announcement.php        Blue strip above the header
    │   ├── header-bar.php          Hamburger, brand, search, action icons
    │   ├── header-search.php       One search bar; CSS repositions it
    │   ├── header-actions.php      Account, wishlist, cart + live badges
    │   ├── nav-primary.php         Desktop navigation row
    │   ├── drawer.php              Off-canvas mobile menu
    │   ├── nav-mobile-bar.php      Fixed bottom tab bar
    │   ├── footer-main.php         Footer columns, social, legal bar
    │   ├── card-product.php        One product card, two layouts
    │   ├── card-category.php       Category card with a real product count
    │   ├── section-categories.php  Category strip from product_cat terms
    │   ├── section-hero.php        Hero + trust strip
    │   ├── section-flash-deal.php  Countdown band around one product
    │   ├── section-popular.php     Popular categories
    │   ├── section-featured.php    Featured products
    │   ├── section-promos.php      Two promotion banners
    │   ├── section-bestsellers.php Ordered by WooCommerce sales
    │   ├── section-testimonials.php  Testimonial rail + dots
    │   ├── section-newsletter.php  Signup form
    │   ├── mini-cart.php           Off-canvas cart panel
    │   └── content*.php            Post, search result, empty state
    └── assets/                     marketly.css, marketly.js
```

### Install

1. Copy `wp-content/themes/marketly/` and `wp-content/plugins/marketly-core/`
   into your WordPress install.
2. Activate **WooCommerce**, then **Marketly Core** under Plugins.
3. Activate **Marketly** under Appearance → Themes. On the next page load this
   creates the Home, Wishlist and Deals pages, sets Home as the front page, and
   switches permalinks to `/%postname%/` if they were still plain.
4. **Appearance → Customize → Marketly Storefront** for the brand tagline,
   announcement bar, header search and footer text/social links.
5. **Appearance → Menus** and assign the Primary, Mobile and three Footer
   locations. Every location degrades gracefully when left unassigned.
6. Add products, product categories and category images in WooCommerce. The
   homepage reads all of them live — nothing about a product is stored in the
   theme, so publishing or editing in wp-admin is the only step needed.
7. **Testimonials → Add Testimonial** for the review carousel. Signups land
   under **Testimonials → Subscribers**.

### How the homepage gets its content

| Section | Source |
|---|---|
| Announcement, hero, promo banners, newsletter copy | Customizer |
| Category strip, Popular Categories | Top-level `product_cat` terms + real counts |
| Flash Deal | A product you pick, plus a deadline. Price, image and link are read from the product, so they never go stale. The band hides itself when the deadline passes. |
| Featured Products | Products starred in WooCommerce; falls back to newest |
| Best Sellers | WooCommerce's own `total_sales` counter |
| Testimonials | Testimonial post type |

Every section removes itself when it has nothing to show, so a store with no
products yet renders a coherent page rather than a column of empty headings.

### WooCommerce

Hooks, not template overrides. The theme ships exactly one WooCommerce
template — `woocommerce/content-product.php` — and it holds no markup of its
own: it defers to the same card partial the homepage uses, so a product looks
identical on the shop, in a category, in related products and on the front
page. Wrappers, columns, breadcrumbs and the loop are all handled through
filters and actions.

WooCommerce's own three stylesheets (~112KB) are dequeued and replaced by
`assets/css/woocommerce.css` (~28KB), which loads only where WooCommerce
markup appears. Product card styles stay in the main stylesheet because the
homepage needs them.

Supported: shop and category archives, single products with variations,
galleries, ratings and reviews, cart, checkout, my account, related products
and up-sells. Both the classic shortcode cart/checkout and WooCommerce's Cart
and Checkout blocks render correctly.

### SEO

Hand-coded, no plugin — and deliberately narrow, because two systems writing
the same tag is worse than either alone.

- **It stands down entirely** when Yoast, Rank Math, SEOPress, All in One SEO,
  The SEO Framework or Slim SEO is active. Verified by simulating Yoast: the
  theme emits nothing, and everything returns when it is removed.
- **It does not duplicate WooCommerce.** WooCommerce already outputs Product,
  Offer, AggregateRating, Review and BreadcrumbList JSON-LD — confirmed in the
  page source, not assumed. The theme adds only what is missing: Organization
  (OnlineStore), WebSite with a search action, and Article for blog posts.
- Meta descriptions with a real fallback chain — a product's short description,
  then its excerpt, then content, then the footer blurb, then the tagline — so
  no page ships without one.
- Canonicals on archives and the shop, which WordPress core leaves alone.
- Open Graph and Twitter cards with real image dimensions.
- `noindex, follow` on search results, filtered catalogue permutations and the
  wishlist, which renders from browser storage and so looks empty to a crawler.

### Security

Every superglobal is sanitised at the point of use. Every write checks a
nonce, autosave, revision state and a capability. No direct SQL anywhere, and
no dynamic code execution. The only unescaped output is theme-authored SVG
from a fixed table, annotated where it occurs. The wishlist REST route is
read-only, validates its input against `^[0-9]+(,[0-9]+)*$`, caps the list at
48 and returns only published, catalogue-visible products — a draft product
was confirmed not to leak through it.

Recommended on the server, not as plugins: `define('DISALLOW_FILE_EDIT', true)`
in `wp-config.php`, HTTPS enforced, a non-`wp_` table prefix, hosting-level
login-attempt limiting, and off-server backups.

### Performance

Measured, not assumed. A product page went from 442KB over 26 requests to
352KB over 19, and from four render-blocking scripts to one:

- WooCommerce's zoom, slider and lightbox libraries (~62KB) are skipped on
  products that have no gallery to show them. Products that do have one keep
  the full set. PhotoSwipe's dialog markup is removed alongside its
  stylesheet, since that markup is what the stylesheet hides.
- jQuery Migrate is dropped on the front end — 13KB of render-blocking shim
  for APIs nothing here uses. It stays in wp-admin.
- Product image lookups are primed in one query instead of one per card.
- WooCommerce's own stylesheets (~112KB) were already replaced in Phase 4.

A persistent object cache (Redis or Memcached) at the hosting level is still
the right answer for query volume; that is a server concern, not a plugin.

### Accessibility

Audited with axe-core across ten templates at WCAG 2.1 AA. Ten violation
types at the start, one at the end — the rating star's gold, kept
deliberately and explained in the stylesheet, since the rating is also
carried by an `aria-label` and the visible review count.

Fixed along the way: contrast on the sale badge, amber buttons, struck-through
prices, countdown labels and the 404 numeral, each against measured ratios
rather than guesses; a testimonial rail that could not be reached by keyboard;
`role="tab"` used without any tab panel; product card headings that skipped a
level on archives; two identically-named search landmarks on one page; and
links in prose distinguished only by colour. The skip link is the first tab
stop and moves focus into `main`, and every focusable control shows a visible
ring — including in forced-colours mode, where `box-shadow` indicators are
stripped by the OS.

### Responsive

Mobile-first, verified rather than assumed. Every template is checked for
horizontal overflow at 320, 360, 390, 414, 430, 480, 640, 768, 834, 1024,
1280, 1440 and 1920px — 320px being the WCAG reflow floor.

Every interactive control reaches a 44px touch target. Where the design calls
for a small control — the wishlist heart on a card, the card's cart button —
the visible size is kept and an invisible pseudo-element carries the hit area.
The testimonial dots are full-size buttons drawing an 8px dot, because
overlaying hit areas on 8px dots would make neighbours swallow each other's
taps. No text is below 10px, and only badges and micro-labels sit that low.

Hover styles that change background, border or shadow are limited to
`(hover: hover)`, so they cannot latch after a tap on a touch screen; `:active`
states give touch users their feedback instead. Landscape phones get a
compact 48px tab bar and no announcement strip, leaving the fixed chrome at
13% of the viewport.

Add to cart is WooCommerce's own AJAX — the header badge and the off-canvas
mini cart refresh through cart fragments, with no page reload.

The wishlist is a per-browser list in `localStorage`: no account needed, no
database writes, and nothing to migrate. The Wishlist page asks a read-only
REST route to render cards for whatever ids the browser holds, and ids that no
longer resolve to a published, catalogue-visible product are pruned.

Requires WordPress 6.4+, PHP 7.4+ and WooCommerce 8.0+.

### Standards

The theme and plugin pass **PHP_CodeSniffer** against the full `WordPress`
ruleset plus `PHPCompatibilityWP` for PHP 7.4+, with no violations and no
blanket exclusions. The handful of `phpcs:ignore` annotations are per-line and
each carries its reason.

To run it yourself:

```bash
composer require --dev squizlabs/php_codesniffer wp-coding-standards/wpcs \
  phpcompatibility/phpcompatibility-wp
vendor/bin/phpcs --standard=WordPress wp-content/themes/marketly \
  wp-content/plugins/marketly-core
```

---

# Haven Realty Group — WordPress

The Haven Realty Group luxury real-estate site, converted from a React 19 / Vite / Firebase single-page app into a server-rendered WordPress site.

Same design. Listings managed entirely from **WordPress Dashboard → Properties**. No frontend CRUD, no page builder, no third-party plugins.

---

## What's here

```
wp-content/
├── plugins/haven-realty-core/     Data layer — owns the content
│   ├── haven-realty-core.php      Bootstrap, activation, capability grant
│   ├── includes/
│   │   ├── functions.php          Template helpers the theme calls
│   │   ├── class-haven-caps.php   Admin-only property capabilities
│   │   ├── class-haven-cpt.php    Property post type + 4 taxonomies
│   │   ├── class-haven-meta.php   Field schema, registration, sanitisation
│   │   ├── class-haven-admin.php  Meta boxes, gallery picker, list columns
│   │   ├── class-haven-query.php  Server-side search / filter / sort
│   │   ├── class-haven-leads.php  Inquiries, consultations, subscribers
│   │   ├── class-haven-forms.php  Nonce + honeypot + rate-limited handlers
│   │   ├── class-haven-favorites.php  REST endpoint for the Saved page
│   │   └── class-haven-demo.php   One-click demo content importer
│   └── assets/                    admin.css, admin.js (media picker)
│
└── themes/haven-realty/           Presentation layer
    ├── functions.php              Setup, enqueues, head trimming
    ├── inc/setup.php              Plugin dependency guard, first-run pages
    ├── inc/seo.php                Titles, meta, canonical, OG, JSON-LD
    ├── inc/customizer.php         Brand, contact, hero, stats, about, social
    ├── inc/template-helpers.php   Inline SVG icons, filter URLs, pagination
    ├── front-page.php             Home — 6 sections
    ├── archive-property.php       Catalog with filters
    ├── single-property.php        Listing detail page
    ├── template-contact.php       Consultation form page
    ├── template-saved.php         Favorites page
    ├── template-parts/            Hero, stats, cards, filters, forms…
    └── assets/                    haven.css (~56KB), haven.js (~9KB)
```

## Install

1. Copy `wp-content/plugins/haven-realty-core/` and `wp-content/themes/haven-realty/` into your WordPress install.
2. **Plugins → activate "Haven Realty Core"** (do this first — it registers the post type and grants capabilities).
3. **Appearance → Themes → activate "Haven Realty"**. This creates the Home, About, Contact and Saved Properties pages, sets Home as the front page, builds a starter menu, and switches permalinks to `/%postname%/` if they were still plain.
4. **Properties → Demo Content → Import** to populate six sample listings, or skip it and add your own.
5. **Appearance → Customize → Haven Realty** to set the brand wordmark, phone, email, office address, hero image, stats and social links.
6. **Settings → Permalinks → Save** once, to be certain the rewrite rules are flushed.

Requires WordPress 6.4+ and PHP 7.4+.

## Managing properties

Everything is on one screen at **Properties → Add Property**:

| Where | What |
|---|---|
| Title + editor | Listing name and full description |
| Featured image | Primary card/hero image |
| **Price** box | Price, rental period, "price on request" |
| **Specification** box | Bedrooms, bathrooms, area, lot, year built, garage |
| **Address** box | Street, city, region, postcode, country |
| **Gallery & Video** box | Multi-select from the Media Library, drag to reorder; optional YouTube/Vimeo link |
| **Listing Representative** box | Per-listing agent name, email, phone, photo (falls back to the Customizer defaults) |
| **Search Appearance** box | SEO title, meta description, noindex toggle |
| **Listing Status** sidebar box | Featured flag, availability (Active / Pending / Sold / Rented) |
| Purpose / Type / Location / Amenities | Taxonomy checkboxes in the sidebar |
| Publish box | Publish, unpublish (Draft/Private), schedule, trash |

Only users with the `edit_properties` capability see any of this. That capability is granted to **Administrator only** — Editors, Authors and Subscribers cannot see, add, edit or delete a listing. To add a "Property Manager" role later, hook the `haven_manager_roles` filter.

Form submissions land under **Properties → Inquiries & Leads**, filterable by type, and are emailed to the address set in the Customizer.

## URLs

| Path | Page |
|---|---|
| `/properties/` | Full catalog |
| `/properties/luxury-villa/` | One listing |
| `/property-type/villa/` | Type archive |
| `/location/malibu/` | Location archive (State → City nesting) |
| `/purpose/for-sale/` | Sale vs rent |
| `/amenity/infinity-pool/` | Amenity archive |
| `/properties/?type=villa&beds=4&min_price=2000000` | Filtered view — real URL, shareable |
| `/wp-sitemap.xml` | Core sitemap, includes all of the above |

## SEO

Hand-coded in `inc/seo.php`, no plugin:

- `<title>` built from the listing name, location and price, overridable per property
- Meta description from the SEO field → excerpt → a generated spec summary, so no listing ships without one
- Canonical on every view; **filtered archives canonicalise back to `/properties/` and carry `noindex,follow`**, so the catalog is indexed once instead of as thousands of permutations
- Open Graph + Twitter card with real image dimensions
- One JSON-LD `@graph` per page: `RealEstateAgent`, `WebSite` with `SearchAction`, plus `RealEstateListing` → `Accommodation` (bedrooms, bathrooms, `floorSize`, `yearBuilt`, `address`, `amenityFeature`) and `Offer` (price, currency, availability, `UnitPriceSpecification` for rentals)
- `BreadcrumbList` matching the visible breadcrumb trail
- `robots.txt` filter pointing at the core sitemap
- Semantic HTML: one `<h1>` per page, real `<nav>`/`<article>`/`<aside>`, labelled form fields, skip link

## Performance

- **No React, no Tailwind runtime, no build step.** One hand-written stylesheet, one deferred 9KB script.
- No jQuery on the front end. Block-library CSS, emoji script, generator/RSD/shortlink tags all removed.
- `add_image_size()` variants sized to the actual slots; every image gets `srcset` + `sizes` via `wp_get_attachment_image()`.
- Hero image preloaded with `fetchpriority="high"`; lazy-loading left to core's LCP-aware heuristics.
- Fonts loaded non-render-blocking with `preconnect` + `display=swap` and a full system fallback stack.
- Video is a facade — nothing is requested from YouTube/Vimeo until a visitor presses play.
- Filtering is one indexed SQL query with real pagination, not an array shipped to the browser.
- Analytics is a hand-coded GA4 snippet that only prints when a measurement ID is entered, and never for logged-in users.

## Security

- Every custom form: nonce, honeypot, 30-second per-IP rate limit, per-field sanitisation, escaped output.
- Every meta field: `register_post_meta()` with a sanitise callback and an `auth_callback` requiring `edit_property`.
- Meta box saving checks nonce, autosave, revision and capability before writing.
- Raw SQL in the search and sort clauses goes through `$wpdb->prepare()`.
- Leads are a private, non-queryable post type with `create_posts => do_not_allow`.

Recommended additions on the server, not as plugins: `define('DISALLOW_FILE_EDIT', true)` in `wp-config.php`, HTTPS enforced, a non-`wp_` table prefix, hosting-level login-attempt limiting, and off-server backups.

## What was dropped from the React app, and why

| Dropped | Reason |
|---|---|
| Firebase Auth, `AuthContext`, `AuthModal`, demo personas | Visitors don't need accounts; the owner uses wp-admin |
| `PropertyFormModal`, `UserDashboard`, `DeleteConfirmDialog` | Frontend CRUD, explicitly out of scope |
| Firestore (`propertyService`, `firebase.ts`, `firestore.rules`) | The WordPress database replaces it |
| `@google/genai` (Gemini) | Declared in `package.json` but never imported anywhere in `src/` — a dead dependency with no feature attached |
| React, Vite, Tailwind, `motion`, `canvas-confetti`, `lucide-react` | ~250KB of JS to render content that must be server-rendered to rank |
| Per-property `ownerId`/`ownerName`/`ownerEmail` | One owner now; a global agent identity with per-listing overrides |

Kept and rebuilt server-side: the full design system, hero + search, stats ribbon, featured grid, property cards, catalog filtering/sorting, detail gallery, specs, amenities, mortgage calculator, inquiry form, consultation form, newsletter, favorites, and the responsive layout at every breakpoint.

## Before launch

- Replace the two Unsplash fallback URLs (hero and about) with your own photography via the Customizer.
- Set descriptive alt text on every uploaded image (Media Library) — it's an SEO and accessibility requirement the code can't do for you.
- Fill in phone, email and office address so the `RealEstateAgent` structured data is complete.
- Run PageSpeed Insights once and confirm HTTPS, the mobile menu, and the contact form on a real device.

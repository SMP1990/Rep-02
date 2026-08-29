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

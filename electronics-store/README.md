# Voltix Electronics — Custom PHP + MySQL eCommerce

A lightweight, custom-coded electronics storefront and admin dashboard.
**No WordPress, no CMS, no page builder, no plugins** — plain PHP, MySQL,
and Tailwind CSS.

> **Status: structure & wireframe phase.** Every page below renders with
> hardcoded placeholder data so the layout and UX can be reviewed. No
> database queries, authentication, cart logic, checkout, or CRUD
> persistence are implemented yet — see [What's intentionally NOT built
> yet](#whats-intentionally-not-built-yet). Functionality lands in Phase 2
> once this structure is approved.

## Folder structure

```
electronics-store/
├── index.php                  Landing page (hero, carousel, featured, top sellers, CTA)
├── shop.php                   Shop page (search, filters, sort, pagination)
├── product.php                Product details page
│
├── admin/                     Admin dashboard (all pages under /admin)
│   ├── login.php              Admin login (standalone layout)
│   ├── dashboard.php          Analytics overview
│   ├── products/
│   │   ├── index.php          Product list
│   │   ├── add.php            Add product form
│   │   └── edit.php           Edit product form
│   ├── categories/index.php   Category list + add panel
│   ├── brands/index.php       Brand list + add panel
│   ├── orders/
│   │   ├── index.php          Order list
│   │   └── view.php           Order detail + status update
│   ├── customers/index.php    Customer list
│   └── includes/              Admin-only layout partials
│       ├── admin-header.php   <head> + sidebar + topbar shell
│       ├── sidebar.php        Left nav
│       └── admin-footer.php   Closing markup
│
├── includes/                  Shared storefront code (protected from direct web access)
│   ├── db.php                 PDO connection factory (get_pdo())
│   ├── functions.php          Helpers: format_price(), e(), ...
│   ├── auth.php                Admin session guard (stub — Phase 2)
│   ├── header.php             <head> + opening <body> + navbar include
│   ├── navbar.php              Storefront navigation
│   └── footer.php             Footer + closing markup
│
├── config/
│   ├── config.sample.php      Copy to config.php and fill in real values
│   └── config.php              (git-ignored — your real DB credentials)
│
├── database/
│   └── schema.sql              Full MySQL schema (see below)
│
├── assets/
│   ├── css/style.css           Small hand-written CSS (Tailwind handles the rest via CDN)
│   ├── js/main.js              Client-side interactions (placeholder)
│   └── images/                 Static image assets
│
└── .gitignore
```

`config/`, `includes/`, and `database/` each carry an `.htaccess` with
`Require all denied` so they can't be requested directly by URL even
though they live inside the web root — convenient for Hostinger-style
shared hosting where the whole project deploys under one `public_html`.

## Database schema

See [`database/schema.sql`](database/schema.sql). Tables:

| Table                    | Purpose |
|---------------------------|---------|
| `admins`                  | Dashboard users (role: super_admin / manager) |
| `categories`               | Product categories, one level of sub-categories via `parent_id` |
| `brands`                   | Product brands |
| `products`                 | Core catalog — price, sale price, stock, `is_featured`, `is_top_seller`, status |
| `product_images`           | Gallery images per product |
| `product_specifications`   | Key/value tech specs (RAM, storage, warranty, ...) |
| `customers`                | Storefront accounts |
| `customer_addresses`       | Saved shipping addresses |
| `carts` / `cart_items`     | Logged-in or guest (session-based) shopping cart |
| `orders`                   | Order header — status, payment, totals, shipping snapshot |
| `order_items`              | Line items — snapshots product name/sku/price at purchase time |
| `settings`                 | Single-row-per-key site configuration (currency, store name, ...) |

Admin "Featured Product" and "Top Seller" controls map directly to the
`is_featured` / `is_top_seller` boolean columns on `products` — no
separate table needed.

Deliberately excluded (per the brief — no unnecessary modules): blog/posts,
reviews, wishlist.

## Tech choices

- **PHP** — plain procedural includes, no framework. `includes/` holds
  shared logic; each page is a single, readable file.
- **MySQL (PDO)** — prepared statements only once querying is implemented
  (Phase 2); schema is InnoDB + `utf8mb4` throughout.
- **Tailwind CSS** — loaded via CDN for this wireframe stage for fast
  iteration. **Before going to production**, swap the CDN `<script>` tag
  in `includes/header.php` / `admin/includes/admin-header.php` for a
  compiled, purged Tailwind build (Tailwind CLI or PostCSS) — the CDN
  build ships the full framework at runtime, which works against the
  "fast loading" requirement.
- Product photos are rendered as placeholder blocks (`.img-placeholder`)
  everywhere — no real `<img>` tags yet, so the wireframe has no external
  image dependencies.

## Setup (local preview)

```bash
cd electronics-store
cp config/config.sample.php config/config.php   # edit if you want to test DB connectivity
php -S localhost:8000
```

Then visit `http://localhost:8000/index.php`, `/shop.php`, `/product.php`,
and `/admin/login.php`, `/admin/dashboard.php`, etc. Every page runs
standalone against hardcoded arrays — a real MySQL server is **not**
required to view the wireframes.

To load the schema once a real database exists:

```bash
mysql -u your_user -p your_database < database/schema.sql
```

## Deploying to Hostinger

This structure assumes the whole `electronics-store/` folder (or its
contents) is uploaded as `public_html`. Hostinger's shared hosting
doesn't let you point the document root above `public_html`, so
`config/`, `includes/`, and `database/` rely on the `.htaccess` deny
rules rather than living outside the web root.

## What's intentionally NOT built yet

Per the brief, this delivery is structure + wireframe only:

- No real database queries — all pages use hardcoded PHP arrays.
- No authentication (`admin/login.php` submits nowhere; `includes/auth.php`
  is an empty stub).
- No product/category/brand/order CRUD — forms render but don't submit.
- No cart, checkout, or payment logic.
- No image upload handling.

Once this structure is approved, Phase 2 adds: PDO-backed queries,
session-based admin auth, full CRUD for products/categories/brands,
search/filter/sort/pagination wired to real SQL, cart + order placement,
and image upload handling.

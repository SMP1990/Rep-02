# Voltix Electronics — Custom PHP + MySQL eCommerce

A lightweight, custom-coded electronics storefront and admin dashboard.
**No WordPress, no CMS, no page builder, no plugins** — plain PHP, MySQL,
and Tailwind CSS.

Fully functional: real database-backed browsing, search/filter/sort/
pagination, a session cart, guest checkout that creates real orders, and
an admin dashboard with authentication and full CRUD for products,
categories, brands, orders and customers. Verified end-to-end against a
live MySQL/MariaDB instance (see [What was tested](#what-was-tested)).

## Folder structure

```
electronics-store/
├── index.php                  Landing page — hero, new arrivals, featured, top sellers, CTA
├── shop.php                   Shop page — search, filters, sort, pagination
├── product.php                Product details — gallery, specs, add to cart, related products
├── cart.php                   Session-based cart (view / update qty / remove)
├── cart-add.php               Add-to-cart handler (POST)
├── checkout.php                Guest checkout — validates stock, creates the order
├── order-confirmation.php      Post-checkout confirmation, looked up by order number
│
├── admin/                     Admin dashboard (all pages under /admin, login-gated)
│   ├── login.php               Admin login
│   ├── logout.php               Destroys the admin session
│   ├── dashboard.php            Real analytics: sales/orders/customers/products, 7-day chart, top categories
│   ├── products/
│   │   ├── index.php            List — search, category filter, pagination
│   │   ├── add.php              Create — images, specs, featured/top-seller toggles
│   │   ├── edit.php             Update — add/remove images, replace specs
│   │   └── delete.php           Delete (POST, CSRF-protected)
│   ├── categories/index.php     Full CRUD (create/edit/delete) on one page
│   ├── brands/index.php         Full CRUD (create/edit/delete) on one page
│   ├── orders/
│   │   ├── index.php            List — search, status filter, pagination
│   │   └── view.php             Detail + status update
│   ├── customers/index.php      List — order count & lifetime spend per customer
│   └── includes/                Admin-only layout partials (sidebar, header, footer)
│
├── includes/                   Shared code (protected from direct web access)
│   ├── bootstrap.php            Loads config + session + db + functions, in order
│   ├── db.php                   PDO connection factory (get_pdo())
│   ├── functions.php             Helpers: pricing, slugs, CSRF, flash messages, image upload, pagination
│   ├── auth.php                  Admin login/logout/session-guard
│   ├── session.php               session_start() bootstrap
│   ├── header.php / navbar.php / footer.php   Storefront layout
│   └── product-card.php          Reusable product card (carousel/grid/related all share it)
│
├── config/
│   ├── config.sample.php        Copy to config.php and fill in real values
│   └── config.php                (git-ignored — your real DB credentials; not in the repo)
│
├── database/
│   ├── schema.sql                Full MySQL schema (see below)
│   └── seed.sql                  Sample admin user, categories, brands, products, and a few orders
│
├── assets/
│   ├── css/style.css             Small hand-written CSS additions
│   ├── js/main.js                 Placeholder for future client-side interactions
│   ├── images/                    Static assets (shared placeholder product graphic)
│   └── uploads/                   Admin-uploaded product/category/brand images (git-ignored)
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
| `customers`                | Storefront accounts (auto-created from checkout by email — no login system) |
| `customer_addresses`       | Saved shipping addresses (schema ready; not yet used by checkout) |
| `carts` / `cart_items`     | Reserved for a DB-backed cart; the current cart is session-based (see below) |
| `orders`                   | Order header — status, payment, totals, shipping snapshot |
| `order_items`              | Line items — snapshots product name/sku/price at purchase time |
| `settings`                 | Site configuration (currency, free-shipping threshold, ...) read via `get_setting()` |

Admin "Featured Product" and "Top Seller" controls map directly to the
`is_featured` / `is_top_seller` boolean columns on `products`.

Deliberately excluded (per the brief — no unnecessary modules): blog/posts,
reviews, wishlist.

## Setup

1. **Create the database and load the schema:**
   ```bash
   mysql -u your_user -p -e "CREATE DATABASE voltix_electronics CHARACTER SET utf8mb4"
   mysql -u your_user -p voltix_electronics < database/schema.sql
   mysql -u your_user -p voltix_electronics < database/seed.sql   # optional sample data
   ```
2. **Configure the app:**
   ```bash
   cp config/config.sample.php config/config.php
   # edit config/config.php with your real DB_HOST / DB_NAME / DB_USER / DB_PASS
   ```
3. **Run it:**
   ```bash
   php -S localhost:8000
   ```
   Visit `http://localhost:8000/index.php` for the storefront and
   `http://localhost:8000/admin/login.php` for the dashboard.

If you loaded `seed.sql`, the admin login is:
- **Email:** `admin@voltix.example`
- **Password:** `Voltix@Admin123`

Change or remove this account before any real deployment.

## Tech choices

- **PHP** — plain procedural includes, no framework. `includes/bootstrap.php`
  is required at the top of every page and wires config → session → PDO →
  helpers in the order each depends on the last.
- **MySQL (PDO)**, prepared statements throughout. Every write that touches
  more than one table (checkout, product image/spec replacement) runs
  inside a transaction; checkout decrements stock with a guarded
  `UPDATE ... WHERE stock_quantity >= ?` to avoid overselling under
  concurrent orders.
- **CSRF protection** on every state-changing form (`csrf_field()` /
  `verify_csrf()`), admin sessions regenerate their session ID on login,
  and password hashes use `password_hash()`/`password_verify()`.
- **Tailwind CSS** via CDN. This is fine for development, but **before a
  real production deploy, swap the CDN `<script>` tag** in
  `includes/header.php` / `admin/includes/admin-header.php` for a
  compiled, purged Tailwind build (Tailwind CLI or PostCSS) — the CDN
  build ships the full framework at runtime, which works against the
  "fast loading" requirement.
- Product/category/brand images are uploaded to `assets/uploads/` (JPG/PNG/
  WEBP, 5MB limit, validated by real MIME sniffing) and fall back to a
  shared placeholder graphic (`assets/images/placeholder-product.svg`)
  when none has been uploaded yet.

## How the storefront works

- **Landing, Shop, Product** pages query `products` live — no hardcoded
  data. Shop supports free-text search, category/brand/price/stock
  filters, five sort orders, and real pagination.
- **Cart** is session-based (`$_SESSION['cart'] = [product_id => qty]`),
  always re-priced and re-validated against current stock on every view —
  nothing stale is trusted from the session except which products and
  quantities were requested.
- **Checkout** is guest-only: it re-validates stock inside a transaction,
  decrements it safely, finds-or-creates a `customers` row by email (with
  a random password hash — there's no customer login/account system in
  this build), and writes `orders` + `order_items`. Free shipping over the
  `settings.free_shipping_threshold` value, a flat $9.99 fee otherwise. No
  real payment gateway is integrated — "Card" and "Bank Transfer" are
  recorded as the chosen method with `payment_status = 'unpaid'`.

## Deploying to Hostinger

This structure assumes the whole `electronics-store/` folder (or its
contents) is uploaded as `public_html`. Hostinger's shared hosting doesn't
let you point the document root above `public_html`, so `config/`,
`includes/`, and `database/` rely on the `.htaccess` deny rules rather than
living outside the web root. Create the MySQL database from Hostinger's
hPanel, then follow the Setup steps above using those credentials.

## What was tested

Every flow below was exercised against a real MySQL/MariaDB instance (not
just linted) before this was pushed:

- Admin login/logout, and that every admin page redirects to login when
  not authenticated.
- Products: create (with multi-image upload + specs), edit (including
  removing an existing image and replacing specs), delete (including
  removing the uploaded files), search/filter/pagination.
- Categories & brands: create, edit, delete — including the FK-safety
  check that refuses to delete a category still holding products.
  Uploaded logos/images are cleaned up on delete.
- Orders: list/filter/pagination, status updates.
- Customers: list with real order counts and lifetime spend.
- Dashboard: stat cards, 7-day sales chart and top-categories bars all
  compared against direct SQL queries on the same data.
- Storefront: search, every filter combination, every sort order,
  pagination, and the 404 page for an unknown/inactive product slug.
- Full guest checkout: add to cart → update quantity → checkout → order
  created, stock decremented, customer record created, cart cleared,
  confirmation page correct, and the new order/customer immediately
  visible in the admin dashboard.
- Security: CSRF token required on every state-changing request; a
  forged add-to-cart request for an out-of-stock product is rejected
  server-side even with a valid session and token (the UI hiding the
  "Add to Cart" button is not the only guard).

## Possible next steps (not implemented — out of the original scope)

- Customer-facing accounts/login and order history (currently: guest
  checkout only, with a customer record created automatically).
- A real payment gateway integration (Stripe, PayPal, etc.).
- A settings page in the admin UI for the `settings` table (currently
  edited directly in the database).
- Compiling Tailwind instead of using the CDN build, for production.

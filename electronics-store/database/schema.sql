-- ============================================================================
-- Voltix Electronics — Database Schema
-- Custom PHP + MySQL eCommerce platform (no CMS/framework)
--
-- Engine:   InnoDB (foreign keys + transactions)
-- Charset:  utf8mb4 / utf8mb4_unicode_ci (full Unicode + emoji safe)
--
-- This file defines STRUCTURE ONLY. Seed/demo data and business logic
-- (stock decrement, order totals, auth, etc.) are implemented in Phase 2.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- admins — dashboard users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(100)        NOT NULL,
    email           VARCHAR(150)        NOT NULL,
    password_hash   VARCHAR(255)        NOT NULL,
    role            ENUM('super_admin','manager') NOT NULL DEFAULT 'manager',
    status          ENUM('active','inactive')     NOT NULL DEFAULT 'active',
    last_login_at   DATETIME            NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- categories — supports one level of sub-categories via parent_id
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id       INT UNSIGNED        NULL,
    name            VARCHAR(100)        NOT NULL,
    slug            VARCHAR(120)        NOT NULL,
    image           VARCHAR(255)        NULL,
    description     TEXT                NULL,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    sort_order      INT                 NOT NULL DEFAULT 0,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_categories_slug (slug),
    KEY idx_categories_parent (parent_id),
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- brands
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)        NOT NULL,
    slug            VARCHAR(120)        NOT NULL,
    logo            VARCHAR(255)        NULL,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_brands_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id         INT UNSIGNED    NOT NULL,
    brand_id            INT UNSIGNED    NULL,
    name                VARCHAR(200)    NOT NULL,
    slug                VARCHAR(220)    NOT NULL,
    sku                 VARCHAR(60)     NOT NULL,
    short_description   VARCHAR(500)    NULL,
    description         TEXT            NULL,
    price               DECIMAL(10,2)   NOT NULL,
    sale_price          DECIMAL(10,2)   NULL,
    stock_quantity      INT UNSIGNED    NOT NULL DEFAULT 0,
    stock_status        ENUM('in_stock','out_of_stock','backorder') NOT NULL DEFAULT 'in_stock',
    is_featured         TINYINT(1)      NOT NULL DEFAULT 0,
    is_top_seller       TINYINT(1)      NOT NULL DEFAULT 0,
    status              ENUM('active','inactive','draft') NOT NULL DEFAULT 'draft',
    views               INT UNSIGNED    NOT NULL DEFAULT 0,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_products_slug (slug),
    UNIQUE KEY uq_products_sku (sku),
    KEY idx_products_category (category_id),
    KEY idx_products_brand (brand_id),
    KEY idx_products_featured (is_featured),
    KEY idx_products_top_seller (is_top_seller),
    KEY idx_products_status (status),
    FULLTEXT KEY ft_products_search (name, short_description),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- product_images — one product has many gallery images
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id      INT UNSIGNED        NOT NULL,
    image_path      VARCHAR(255)        NOT NULL,
    is_primary      TINYINT(1)          NOT NULL DEFAULT 0,
    sort_order      INT                 NOT NULL DEFAULT 0,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_product_images_product (product_id),
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- product_specifications — key/value tech specs (RAM, storage, warranty...)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_specifications (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id      INT UNSIGNED        NOT NULL,
    spec_name       VARCHAR(100)        NOT NULL,
    spec_value      VARCHAR(255)        NOT NULL,
    sort_order      INT                 NOT NULL DEFAULT 0,
    KEY idx_product_specs_product (product_id),
    CONSTRAINT fk_product_specs_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- customers — storefront accounts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(150)        NOT NULL,
    email           VARCHAR(150)        NOT NULL,
    phone           VARCHAR(20)         NULL,
    password_hash   VARCHAR(255)        NOT NULL,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_customers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- customer_addresses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_addresses (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id     INT UNSIGNED        NOT NULL,
    label           VARCHAR(50)         NOT NULL DEFAULT 'Home',
    full_name       VARCHAR(150)        NOT NULL,
    phone           VARCHAR(20)         NOT NULL,
    address_line1   VARCHAR(255)        NOT NULL,
    address_line2   VARCHAR(255)        NULL,
    city            VARCHAR(100)        NOT NULL,
    state           VARCHAR(100)        NOT NULL,
    postal_code     VARCHAR(20)         NOT NULL,
    country         VARCHAR(100)        NOT NULL,
    is_default      TINYINT(1)          NOT NULL DEFAULT 0,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_addresses_customer (customer_id),
    CONSTRAINT fk_addresses_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- carts / cart_items — supports logged-in customers and guest sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carts (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id     INT UNSIGNED        NULL,
    session_id      VARCHAR(191)        NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_carts_customer (customer_id),
    KEY idx_carts_session (session_id),
    CONSTRAINT fk_carts_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_id         INT UNSIGNED        NOT NULL,
    product_id      INT UNSIGNED        NOT NULL,
    quantity        INT UNSIGNED        NOT NULL DEFAULT 1,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cart_product (cart_id, product_id),
    KEY idx_cart_items_product (product_id),
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number            VARCHAR(30)     NOT NULL,
    customer_id             INT UNSIGNED    NULL,
    guest_email             VARCHAR(150)    NULL,
    status                  ENUM('pending','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
    payment_method          ENUM('cod','card','bank_transfer') NOT NULL DEFAULT 'cod',
    payment_status          ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
    subtotal                DECIMAL(10,2)   NOT NULL DEFAULT 0,
    discount_amount         DECIMAL(10,2)   NOT NULL DEFAULT 0,
    shipping_fee            DECIMAL(10,2)   NOT NULL DEFAULT 0,
    tax_amount              DECIMAL(10,2)   NOT NULL DEFAULT 0,
    total_amount            DECIMAL(10,2)   NOT NULL DEFAULT 0,
    shipping_full_name      VARCHAR(150)    NOT NULL,
    shipping_phone          VARCHAR(20)     NOT NULL,
    shipping_address_line1  VARCHAR(255)    NOT NULL,
    shipping_address_line2  VARCHAR(255)    NULL,
    shipping_city           VARCHAR(100)    NOT NULL,
    shipping_state          VARCHAR(100)    NOT NULL,
    shipping_postal_code    VARCHAR(20)     NOT NULL,
    shipping_country        VARCHAR(100)    NOT NULL,
    notes                   TEXT            NULL,
    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_orders_number (order_number),
    KEY idx_orders_customer (customer_id),
    KEY idx_orders_status (status),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- order_items — snapshot of product name/price/sku at time of purchase
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        INT UNSIGNED        NOT NULL,
    product_id      INT UNSIGNED        NULL,
    product_name    VARCHAR(200)        NOT NULL,
    product_sku     VARCHAR(60)         NOT NULL,
    unit_price      DECIMAL(10,2)       NOT NULL,
    quantity        INT UNSIGNED        NOT NULL,
    line_total      DECIMAL(10,2)       NOT NULL,
    KEY idx_order_items_order (order_id),
    KEY idx_order_items_product (product_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- settings — single-row-per-key site configuration (currency, store name...)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key     VARCHAR(100)        NOT NULL,
    setting_value   TEXT                NULL,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

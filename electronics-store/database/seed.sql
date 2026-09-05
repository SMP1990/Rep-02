-- ============================================================================
-- Voltix Electronics — Sample seed data (safe to re-run: clears then reloads)
--
-- Includes one ready-to-use admin login:
--   email:    admin@voltix.example
--   password: Voltix@Admin123
-- Change this password immediately on a real deployment.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE cart_items;
TRUNCATE TABLE carts;
TRUNCATE TABLE customer_addresses;
TRUNCATE TABLE customers;
TRUNCATE TABLE product_specifications;
TRUNCATE TABLE product_images;
TRUNCATE TABLE products;
TRUNCATE TABLE brands;
TRUNCATE TABLE categories;
TRUNCATE TABLE admins;
TRUNCATE TABLE settings;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- Admin (password: Voltix@Admin123)
-- ----------------------------------------------------------------------------
INSERT INTO admins (full_name, email, password_hash, role, status) VALUES
('Store Admin', 'admin@voltix.example', '$2y$12$njYp/1qaHNPnJPVGruAA2.Cju5LxFlUdNbIKxk./KDJ/.ToRQzOXS', 'super_admin', 'active');

-- ----------------------------------------------------------------------------
-- Categories
-- ----------------------------------------------------------------------------
INSERT INTO categories (id, name, slug, status, sort_order) VALUES
(1, 'Laptops', 'laptops', 'active', 1),
(2, 'Audio', 'audio', 'active', 2),
(3, 'Cameras', 'cameras', 'active', 3),
(4, 'Wearables', 'wearables', 'active', 4),
(5, 'Tablets', 'tablets', 'active', 5),
(6, 'Accessories', 'accessories', 'active', 6),
(7, 'Chargers', 'chargers', 'active', 7);

-- ----------------------------------------------------------------------------
-- Brands
-- ----------------------------------------------------------------------------
INSERT INTO brands (id, name, slug, status) VALUES
(1, 'Voltix', 'voltix', 'active'),
(2, 'Nimbus', 'nimbus', 'active'),
(3, 'PulseTech', 'pulsetech', 'active'),
(4, 'OrbitLabs', 'orbitlabs', 'active'),
(5, 'FlowGear', 'flowgear', 'active');

-- ----------------------------------------------------------------------------
-- Products
-- ----------------------------------------------------------------------------
INSERT INTO products (id, category_id, brand_id, name, slug, sku, short_description, description, price, sale_price, stock_quantity, stock_status, is_featured, is_top_seller, status) VALUES
(1, 1, 1, 'AeroBook Pro 14"', 'aerobook-pro-14', 'VLX-AB14-256', 'Featherlight 14" laptop built for creators.', 'A featherlight 14" laptop built for creators and professionals. All-day battery, a stunning display, and enough power to handle serious workloads without the fan noise.', 1299.00, 1149.00, 14, 'in_stock', 1, 0, 'active'),
(2, 1, 1, 'AeroBook Air 13"', 'aerobook-air-13', 'VLX-AA13-128', 'Ultra-portable 13" laptop for everyday work.', 'The AeroBook Air trades raw power for portability without giving up the essentials — a sharp display, silent operation, and a full day of battery life.', 999.00, NULL, 27, 'in_stock', 0, 0, 'active'),
(3, 2, 2, 'Nimbus Wireless Earbuds', 'nimbus-wireless-earbuds', 'NMB-EB-01', 'True wireless earbuds with active noise cancellation.', 'Crystal-clear calls, deep bass, and up to 30 hours of battery with the charging case. Active noise cancellation blocks out the world when you need to focus.', 129.00, 99.00, 58, 'in_stock', 1, 1, 'active'),
(4, 2, 2, 'EchoBar Soundbar', 'echobar-soundbar', 'NMB-SB-02', 'Compact soundbar with room-filling sound.', 'A 2.1-channel soundbar with a wireless subwoofer, Bluetooth and HDMI ARC — big sound without the big footprint.', 189.00, NULL, 0, 'out_of_stock', 0, 1, 'active'),
(5, 3, 3, 'PulseCam 4K Action Cam', 'pulsecam-4k-action-cam', 'PLT-CAM4K', 'Rugged 4K action camera with image stabilization.', 'Waterproof to 10m, records smooth 4K60 footage with electronic image stabilization. Comes with a full mounting kit.', 249.00, NULL, 21, 'in_stock', 0, 0, 'active'),
(6, 4, 4, 'OrbitWatch SE', 'orbitwatch-se', 'ORB-WSE', 'Smartwatch with health tracking and 5-day battery.', 'Track heart rate, sleep and workouts, and get notifications on your wrist — all with a battery that lasts up to 5 days.', 199.00, 169.00, 32, 'in_stock', 1, 0, 'active'),
(7, 5, 4, 'GridPad 11 Tablet', 'gridpad-11-tablet', 'ORB-GP11', '11" tablet with a stylus for work and play.', 'A fast, 11" tablet with a laminated display, quad speakers, and support for an optional stylus and keyboard case.', 349.00, 299.00, 18, 'in_stock', 0, 1, 'active'),
(8, 6, 5, 'FlowMouse Ergo', 'flowmouse-ergo', 'FLW-MSE-01', 'Ergonomic wireless mouse for all-day comfort.', 'A vertical ergonomic design that keeps your wrist in a natural position, with silent clicks and a 6-month battery life.', 59.00, NULL, 132, 'in_stock', 0, 1, 'active'),
(9, 7, 1, 'VoltCharge 65W GaN', 'voltcharge-65w-gan', 'VLX-CHG-65', 'Compact 65W GaN charger for laptops and phones.', 'Charge your laptop and phone at full speed from one compact, pocketable GaN charger. Two USB-C ports with smart power sharing.', 39.00, NULL, 210, 'in_stock', 0, 1, 'active'),
(10, 6, 5, 'FlowKey Mechanical Keyboard', 'flowkey-mechanical-keyboard', 'FLW-KB-03', 'Compact mechanical keyboard with hot-swappable switches.', 'A tenkeyless mechanical keyboard with hot-swappable switches, per-key RGB, and a braided USB-C cable.', 89.00, NULL, 40, 'in_stock', 0, 0, 'active'),
(11, 3, 3, 'PulseLens 65mm Prime', 'pulselens-65mm-prime', 'PLT-LNS-65', 'Sharp 65mm prime lens for mirrorless cameras.', 'A fast, sharp prime lens with a wide aperture for portraits and low-light photography.', 429.00, NULL, 9, 'in_stock', 0, 0, 'active'),
(12, 4, 4, 'OrbitBand Fit', 'orbitband-fit', 'ORB-BND-01', 'Lightweight fitness band with a 10-day battery.', 'Tracks steps, heart rate and sleep in a slim, all-day comfortable band that goes 10 days between charges.', 49.00, NULL, 75, 'in_stock', 0, 0, 'active'),
(13, 1, 1, 'AeroBook Studio 16"', 'aerobook-studio-16', 'VLX-AS16-512', 'High-performance 16" laptop for demanding workloads.', 'A discrete-graphics 16" workstation laptop for video editing, 3D rendering and other demanding creative work. (Currently unavailable while we restock.)', 1899.00, NULL, 0, 'backorder', 0, 0, 'draft');

-- ----------------------------------------------------------------------------
-- Product Images (all products use the shared placeholder graphic for now —
-- upload real photography from Admin → Products → Edit)
-- ----------------------------------------------------------------------------
INSERT INTO product_images (product_id, image_path, is_primary, sort_order)
SELECT id, '/electronics-store/assets/images/placeholder-product.svg', 1, 0 FROM products;

-- ----------------------------------------------------------------------------
-- Product Specifications
-- ----------------------------------------------------------------------------
INSERT INTO product_specifications (product_id, spec_name, spec_value, sort_order) VALUES
(1, 'Processor', '12-core ARM, 3.5GHz', 1),
(1, 'RAM', '16GB Unified Memory', 2),
(1, 'Storage', '512GB NVMe SSD', 3),
(1, 'Display', '14" Liquid Retina, 120Hz', 4),
(1, 'Battery', 'Up to 18 hours', 5),
(1, 'Warranty', '2-Year Limited Warranty', 6),
(3, 'Driver Size', '11mm Dynamic', 1),
(3, 'Battery Life', '8h (30h with case)', 2),
(3, 'Noise Cancellation', 'Active, -32dB', 3),
(3, 'Water Resistance', 'IPX4', 4),
(6, 'Display', '1.4" AMOLED', 1),
(6, 'Battery Life', 'Up to 5 days', 2),
(6, 'Water Resistance', '5 ATM', 3);

-- ----------------------------------------------------------------------------
-- Sample customers, orders & order items (so Dashboard/Orders/Customers
-- aren't empty on first login)
-- ----------------------------------------------------------------------------
INSERT INTO customers (id, full_name, email, phone, password_hash, status, created_at) VALUES
(1, 'James Carter', 'james.carter@example.com', '+1 555-0134', '$2y$12$3z0m7l1s7Vw2Y6b8mVQeXe8s7q8m3Xk0N1p2r3s4t5u6v7w8x9y0z', 'active', '2025-11-02 10:15:00'),
(2, 'Aisha Khan', 'aisha.khan@example.com', '+1 555-0198', '$2y$12$3z0m7l1s7Vw2Y6b8mVQeXe8s7q8m3Xk0N1p2r3s4t5u6v7w8x9y0z', 'active', '2025-12-14 09:02:00'),
(3, 'Sara Wu', 'sara.wu@example.com', '+1 555-0166', '$2y$12$3z0m7l1s7Vw2Y6b8mVQeXe8s7q8m3Xk0N1p2r3s4t5u6v7w8x9y0z', 'active', '2025-08-09 16:40:00');

INSERT INTO orders (id, order_number, customer_id, status, payment_method, payment_status, subtotal, discount_amount, shipping_fee, tax_amount, total_amount, shipping_full_name, shipping_phone, shipping_address_line1, shipping_city, shipping_state, shipping_postal_code, shipping_country, created_at) VALUES
(1, 'VLX-10245', 1, 'delivered', 'card', 'paid', 249.00, 0, 0, 0, 249.00, 'James Carter', '+1 555-0134', '482 Maple Street', 'Austin', 'TX', '73301', 'USA', '2026-09-04 14:32:00'),
(2, 'VLX-10244', 2, 'processing', 'card', 'paid', 1149.00, 0, 0, 0, 1149.00, 'Aisha Khan', '+1 555-0198', '19 Birch Ave', 'Seattle', 'WA', '98101', 'USA', '2026-09-04 11:05:00'),
(3, 'VLX-10242', 3, 'shipped', 'card', 'paid', 299.00, 0, 0, 0, 299.00, 'Sara Wu', '+1 555-0166', '77 Cedar Court', 'Denver', 'CO', '80201', 'USA', '2026-09-03 08:20:00');

INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_price, quantity, line_total) VALUES
(1, 5, 'PulseCam 4K Action Cam', 'PLT-CAM4K', 249.00, 1, 249.00),
(2, 1, 'AeroBook Pro 14"', 'VLX-AB14-256', 1149.00, 1, 1149.00),
(3, 7, 'GridPad 11 Tablet', 'ORB-GP11', 299.00, 1, 299.00);

-- ----------------------------------------------------------------------------
-- Settings
-- ----------------------------------------------------------------------------
INSERT INTO settings (setting_key, setting_value) VALUES
('store_name', 'Voltix Electronics'),
('store_currency_symbol', '$'),
('free_shipping_threshold', '99.00');

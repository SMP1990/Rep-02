<?php
/**
 * Plugin Name:       Haven Realty Core
 * Plugin URI:        https://havenrealty.com
 * Description:       Property data layer for Haven Realty Group — Property post type, taxonomies, admin-only listing management, inquiry/consultation/newsletter capture. Content lives here so it survives a theme change.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Haven Realty Group
 * License:           GPL-2.0-or-later
 * Text Domain:       haven
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

define( 'HAVEN_CORE_VERSION', '1.0.0' );
define( 'HAVEN_CORE_FILE', __FILE__ );
define( 'HAVEN_CORE_DIR', plugin_dir_path( __FILE__ ) );
define( 'HAVEN_CORE_URL', plugin_dir_url( __FILE__ ) );

require_once HAVEN_CORE_DIR . 'includes/functions.php';
require_once HAVEN_CORE_DIR . 'includes/class-haven-caps.php';
require_once HAVEN_CORE_DIR . 'includes/class-haven-cpt.php';
require_once HAVEN_CORE_DIR . 'includes/class-haven-meta.php';
require_once HAVEN_CORE_DIR . 'includes/class-haven-admin.php';
require_once HAVEN_CORE_DIR . 'includes/class-haven-query.php';
require_once HAVEN_CORE_DIR . 'includes/class-haven-leads.php';
require_once HAVEN_CORE_DIR . 'includes/class-haven-forms.php';
require_once HAVEN_CORE_DIR . 'includes/class-haven-favorites.php';
require_once HAVEN_CORE_DIR . 'includes/class-haven-demo.php';

/**
 * Boot every module on `plugins_loaded` so the theme can rely on the data layer.
 */
function haven_core_boot() {
	Haven_CPT::init();
	Haven_Meta::init();
	Haven_Admin::init();
	Haven_Query::init();
	Haven_Leads::init();
	Haven_Forms::init();
	Haven_Favorites::init();
	Haven_Demo::init();
}
add_action( 'plugins_loaded', 'haven_core_boot' );

/**
 * Activation: register rewrite rules and grant property capabilities to administrators.
 */
function haven_core_activate() {
	Haven_CPT::register_post_types();
	Haven_CPT::register_taxonomies();
	Haven_Leads::register_post_types();
	Haven_CPT::seed_default_terms();
	Haven_Caps::grant_to_admins();
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'haven_core_activate' );

/**
 * Deactivation: only clear rewrite rules. Listings and leads are never touched.
 */
function haven_core_deactivate() {
	flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'haven_core_deactivate' );

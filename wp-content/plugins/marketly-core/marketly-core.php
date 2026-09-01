<?php
/**
 * Plugin Name:       Marketly Core
 * Plugin URI:        https://example.com/marketly
 * Description:       The data layer behind the Marketly storefront theme: testimonials, newsletter subscribers, secure form handling and the wishlist endpoint. Keeping this in a plugin rather than the theme means the content survives a theme change.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Marketly
 * Author URI:        https://example.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       marketly-core
 * Domain Path:       /languages
 *
 * @package Marketly_Core
 */

defined( 'ABSPATH' ) || exit;

define( 'MARKETLY_CORE_VERSION', '1.0.0' );
define( 'MARKETLY_CORE_FILE', __FILE__ );
define( 'MARKETLY_CORE_DIR', plugin_dir_path( __FILE__ ) );
define( 'MARKETLY_CORE_URL', plugin_dir_url( __FILE__ ) );

/**
 * Load the plugin's includes.
 *
 * Later phases add their class files to this list. Everything is loaded on
 * plugins_loaded so WooCommerce and the theme are both known quantities by
 * the time any of it runs.
 */
function marketly_core_load() {
	$includes = array(
		'includes/functions.php',
		'includes/class-marketly-testimonials.php',
		'includes/class-marketly-subscribers.php',
		'includes/class-marketly-forms.php',
		'includes/demo-catalogue.php',
		'includes/class-marketly-demo-images.php',
		'includes/class-marketly-demo.php',
	);

	/**
	 * Filter the files the plugin loads.
	 *
	 * @param string[] $includes Paths relative to the plugin directory.
	 */
	$includes = (array) apply_filters( 'marketly_core_includes', $includes );

	foreach ( $includes as $file ) {
		$path = MARKETLY_CORE_DIR . ltrim( $file, '/' );

		if ( is_readable( $path ) ) {
			require_once $path;
		}
	}

	Marketly_Testimonials::init();
	Marketly_Subscribers::init();
	Marketly_Forms::init();

	if ( is_admin() ) {
		Marketly_Demo::init();
	}

	/**
	 * Fires once every Marketly Core include is loaded.
	 */
	do_action( 'marketly_core_loaded' );
}
add_action( 'plugins_loaded', 'marketly_core_load' );

/**
 * Load translations.
 */
function marketly_core_textdomain() {
	load_plugin_textdomain( 'marketly-core', false, dirname( plugin_basename( MARKETLY_CORE_FILE ) ) . '/languages' );
}
add_action( 'init', 'marketly_core_textdomain' );

/**
 * Activation.
 *
 * Post types registered by later phases need their rewrite rules flushed once,
 * on activation only — never on every request, which is a well-known way to
 * make a site slow.
 */
function marketly_core_activate() {
	marketly_core_load();

	/**
	 * Fires during activation, after includes are loaded, so post types can
	 * register themselves before the rules are flushed.
	 */
	do_action( 'marketly_core_activate' );

	flush_rewrite_rules( false );
}
register_activation_hook( __FILE__, 'marketly_core_activate' );

/**
 * Deactivation — clear the rules this plugin's post types added.
 */
function marketly_core_deactivate() {
	flush_rewrite_rules( false );
}
register_deactivation_hook( __FILE__, 'marketly_core_deactivate' );

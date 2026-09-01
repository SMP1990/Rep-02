<?php
/**
 * Marketly theme setup.
 *
 * Deliberately small: one stylesheet, one deferred script, no jQuery on the
 * front end, no block library CSS on non-block pages, no emoji script.
 * Everything a visitor downloads is listed in marketly_enqueue_assets().
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

define( 'MARKETLY_VERSION', '1.0.0' );
define( 'MARKETLY_DIR', get_template_directory() );
define( 'MARKETLY_URI', get_template_directory_uri() );

require_once MARKETLY_DIR . '/inc/setup.php';
require_once MARKETLY_DIR . '/inc/template-helpers.php';
require_once MARKETLY_DIR . '/inc/customizer.php';
require_once MARKETLY_DIR . '/inc/customizer-storefront.php';
require_once MARKETLY_DIR . '/inc/seo.php';
require_once MARKETLY_DIR . '/inc/storefront.php';

if ( class_exists( 'WooCommerce' ) ) {
	require_once MARKETLY_DIR . '/inc/woocommerce.php';
}
require_once MARKETLY_DIR . '/inc/header-footer.php';

/**
 * Theme supports, menus and image sizes.
 */
function marketly_setup() {
	load_theme_textdomain( 'marketly', MARKETLY_DIR . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'customize-selective-refresh-widgets' );
	add_theme_support(
		'html5',
		array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script', 'navigation-widgets' )
	);
	add_theme_support(
		'custom-logo',
		array(
			'height'      => 40,
			'width'       => 40,
			'flex-height' => true,
			'flex-width'  => true,
		)
	);

	// Product imagery is the content here, so generate sizes that match the
	// actual slots in the templates instead of shipping oversized originals.
	set_post_thumbnail_size( 600, 600, true );
	add_image_size( 'marketly-card', 600, 600, true );      // Product card.
	add_image_size( 'marketly-thumb', 200, 200, true );     // Rail / mini-cart.
	add_image_size( 'marketly-tile', 320, 320, true );      // Category tile.
	add_image_size( 'marketly-banner', 1200, 700, false );  // Hero / promo art.

	register_nav_menus(
		array(
			'primary'  => __( 'Primary Menu (desktop header)', 'marketly' ),
			'mobile'   => __( 'Mobile Drawer Menu', 'marketly' ),
			'footer-1' => __( 'Footer — Column 1', 'marketly' ),
			'footer-2' => __( 'Footer — Column 2', 'marketly' ),
			'footer-3' => __( 'Footer — Column 3', 'marketly' ),
		)
	);
}
add_action( 'after_setup_theme', 'marketly_setup' );

/**
 * Content width used by embeds.
 */
function marketly_content_width() {
	$GLOBALS['content_width'] = 1280;
}
add_action( 'after_setup_theme', 'marketly_content_width', 0 );

/**
 * Widget areas.
 *
 * Only the shop sidebar — the rest of the layout is template-driven, so extra
 * sidebars would be dead weight.
 */
function marketly_widgets_init() {
	register_sidebar(
		array(
			'name'          => __( 'Shop Sidebar', 'marketly' ),
			'id'            => 'shop-sidebar',
			'description'   => __( 'Filters and widgets shown beside product archives.', 'marketly' ),
			'before_widget' => '<section id="%1$s" class="widget %2$s">',
			'after_widget'  => '</section>',
			'before_title'  => '<h2 class="widget__title">',
			'after_title'   => '</h2>',
		)
	);
}
add_action( 'widgets_init', 'marketly_widgets_init' );

/**
 * Enqueue the front-end stylesheet and script.
 *
 * The script is deferred and carries progressive enhancements only — every
 * page renders, navigates and submits without it.
 */
function marketly_enqueue_assets() {
	$css = MARKETLY_DIR . '/assets/css/marketly.css';
	$js  = MARKETLY_DIR . '/assets/js/marketly.js';

	wp_enqueue_style(
		'marketly',
		MARKETLY_URI . '/assets/css/marketly.css',
		array(),
		file_exists( $css ) ? (string) filemtime( $css ) : MARKETLY_VERSION
	);

	wp_enqueue_script(
		'marketly',
		MARKETLY_URI . '/assets/js/marketly.js',
		array(),
		file_exists( $js ) ? (string) filemtime( $js ) : MARKETLY_VERSION,
		array(
			'strategy'  => 'defer',
			'in_footer' => true,
		)
	);

	// Everything the script needs from PHP. Strings are translated here so the
	// JS file itself carries no user-facing copy.
	wp_localize_script(
		'marketly',
		'marketlyData',
		array(
			'ajaxUrl' => esc_url_raw( admin_url( 'admin-ajax.php' ) ),
			'restUrl' => esc_url_raw( rest_url( 'marketly/v1/' ) ),
			'nonce'   => wp_create_nonce( 'wp_rest' ),
			'i18n'    => array(
				'added'     => __( 'Added to your wishlist', 'marketly' ),
				'removed'   => __( 'Removed from your wishlist', 'marketly' ),
				'menuOpen'  => __( 'Open menu', 'marketly' ),
				'menuClose' => __( 'Close menu', 'marketly' ),
				'days'      => __( 'Days', 'marketly' ),
				'hours'     => __( 'Hrs', 'marketly' ),
				'minutes'   => __( 'Mins', 'marketly' ),
				'seconds'   => __( 'Secs', 'marketly' ),
				'expired'   => __( 'This deal has ended', 'marketly' ),
				'loadError' => __( 'We couldn’t load your saved products. Please refresh and try again.', 'marketly' ),
			),
		)
	);

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'marketly_enqueue_assets' );

/**
 * Drop jQuery Migrate on the front end.
 *
 * It exists to shim jQuery APIs removed in 3.0 and logs warnings about them.
 * Nothing in this theme uses jQuery at all, and current WooCommerce does not
 * need the shim — it is 13KB of render-blocking script for compatibility with
 * code that is not here. It stays in wp-admin, where a plugin might rely on it.
 *
 * @param WP_Scripts $scripts The scripts registry, passed by reference.
 */
function marketly_drop_jquery_migrate( $scripts ) {
	if ( is_admin() || empty( $scripts->registered['jquery'] ) ) {
		return;
	}

	$scripts->registered['jquery']->deps = array_diff(
		$scripts->registered['jquery']->deps,
		array( 'jquery-migrate' )
	);
}
add_action( 'wp_default_scripts', 'marketly_drop_jquery_migrate' );

/**
 * Drop the block library stylesheets on pages that render no blocks.
 *
 * Templates in this theme are hand-written PHP, so on the storefront the block
 * CSS is typically ~30KB of render-blocking rules for markup that never
 * appears. Singular views keep it, since editors do use blocks in page content.
 */
function marketly_dequeue_block_styles() {
	if ( is_admin() ) {
		return;
	}

	// Keep them only where blocks are genuinely rendered — an editor's page
	// content. Checking the content itself rather than just is_singular()
	// means a hand-written template does not pay for CSS it never uses.
	if ( is_singular() && ! is_front_page() && has_blocks( get_queried_object_id() ) ) {
		return;
	}

	wp_dequeue_style( 'wp-block-library' );
	wp_dequeue_style( 'wp-block-library-theme' );
	wp_dequeue_style( 'global-styles' );
	wp_dequeue_style( 'classic-theme-styles' );
}
add_action( 'wp_enqueue_scripts', 'marketly_dequeue_block_styles', 100 );

/**
 * Add a body class describing the current shell, so CSS can branch without
 * sniffing the user agent.
 *
 * @param string[] $classes Existing body classes.
 * @return string[]
 */
function marketly_body_classes( $classes ) {
	if ( ! is_singular() ) {
		$classes[] = 'hfeed';
	}

	if ( marketly_has_woocommerce() ) {
		$classes[] = 'has-woocommerce';
	}

	if ( is_front_page() ) {
		$classes[] = 'is-storefront';
	}

	// The fixed bottom tab bar needs padding underneath it on small screens.
	$classes[] = 'has-tabbar';

	return $classes;
}
add_filter( 'body_class', 'marketly_body_classes' );

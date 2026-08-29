<?php
/**
 * Haven Realty theme setup.
 *
 * Deliberately small: one stylesheet, one deferred script, no jQuery on the
 * front end, no block library CSS, no emoji script. Everything the visitor
 * downloads is listed here.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

define( 'HAVEN_VERSION', '1.0.0' );

require_once get_template_directory() . '/inc/setup.php';
require_once get_template_directory() . '/inc/template-helpers.php';
require_once get_template_directory() . '/inc/seo.php';
require_once get_template_directory() . '/inc/customizer.php';

/**
 * Theme supports, menus and image sizes.
 */
function haven_setup() {
	load_theme_textdomain( 'haven', get_template_directory() . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'customize-selective-refresh-widgets' );
	add_theme_support(
		'html5',
		array( 'search-form', 'gallery', 'caption', 'style', 'script', 'navigation-widgets' )
	);

	// Listing photography is the content here, so generate sizes that match the
	// exact slots in the templates instead of shipping oversized originals.
	set_post_thumbnail_size( 800, 550, true );
	add_image_size( 'haven-card', 800, 550, true );      // 16:11 catalog card.
	add_image_size( 'haven-card-2x', 1200, 825, true );  // Retina card.
	add_image_size( 'haven-hero', 2000, 1200, true );    // Home hero.
	add_image_size( 'haven-gallery', 1600, 900, true );  // Detail-page stage.
	add_image_size( 'haven-thumb', 240, 160, true );     // Gallery thumbnail strip.

	register_nav_menus(
		array(
			'primary' => __( 'Primary Menu', 'haven' ),
			'footer'  => __( 'Footer — Quick Links', 'haven' ),
			'legal'   => __( 'Footer — Services', 'haven' ),
		)
	);
}
add_action( 'after_setup_theme', 'haven_setup' );

/**
 * Content width used by embeds.
 */
function haven_content_width() {
	$GLOBALS['content_width'] = 1280;
}
add_action( 'after_setup_theme', 'haven_content_width', 0 );

/**
 * Enqueue the front-end stylesheet and script.
 *
 * The script is deferred and carries only progressive enhancements — the site
 * renders and navigates fully without it.
 */
function haven_enqueue_assets() {
	$css = get_template_directory() . '/assets/css/haven.css';
	$js  = get_template_directory() . '/assets/js/haven.js';

	wp_enqueue_style(
		'haven',
		get_template_directory_uri() . '/assets/css/haven.css',
		array(),
		file_exists( $css ) ? (string) filemtime( $css ) : HAVEN_VERSION
	);

	wp_enqueue_script(
		'haven',
		get_template_directory_uri() . '/assets/js/haven.js',
		array(),
		file_exists( $js ) ? (string) filemtime( $js ) : HAVEN_VERSION,
		array(
			'strategy'  => 'defer',
			'in_footer' => true,
		)
	);

	wp_localize_script(
		'haven',
		'havenData',
		array(
			'favoritesEndpoint' => esc_url_raw( rest_url( 'haven/v1/favorites' ) ),
			'archiveUrl'        => esc_url_raw( haven_archive_url() ),
			'i18n'              => array(
				'saved'      => __( 'Saved to favorites', 'haven' ),
				'removed'    => __( 'Removed from favorites', 'haven' ),
				'copied'     => __( 'Property link copied', 'haven' ),
				'save'       => __( 'Save to favorites', 'haven' ),
				'unsave'     => __( 'Remove from favorites', 'haven' ),
				'empty'      => __( 'You have not saved any properties yet.', 'haven' ),
				'loadError'  => __( 'Could not load your saved properties.', 'haven' ),
			),
		)
	);
}
add_action( 'wp_enqueue_scripts', 'haven_enqueue_assets' );

/**
 * Preconnect to the font host and preload the LCP image.
 *
 * Both are Core Web Vitals wins: the preconnect removes a round trip before
 * the font request, the preload lets the browser start the hero image before
 * the CSS that references it has parsed.
 */
function haven_resource_hints() {
	echo '<link rel="preconnect" href="https://fonts.googleapis.com">' . "\n";
	echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
	echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" media="print" onload="this.media=\'all\'">' . "\n";
	echo '<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"></noscript>' . "\n";

	$lcp = haven_lcp_image_url();

	if ( $lcp ) {
		printf( '<link rel="preload" as="image" href="%s" fetchpriority="high">' . "\n", esc_url( $lcp ) );
	}
}
add_action( 'wp_head', 'haven_resource_hints', 1 );

/**
 * Strip front-end weight WordPress ships by default but this theme never uses.
 */
function haven_trim_head() {
	remove_action( 'wp_head', 'wp_generator' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wp_shortlink_wp_head' );
	remove_action( 'wp_head', 'adjacent_posts_rel_link_wp_head', 10 );

	// Emoji: two HTTP requests and ~12KB of JavaScript for nothing.
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );
	remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
	remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
	remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );

	// Core canonical is replaced by the theme's own, which handles filtered archives.
	remove_action( 'wp_head', 'rel_canonical' );
}
add_action( 'init', 'haven_trim_head' );

/**
 * Drop the block editor stylesheets on the front end.
 *
 * The theme styles every element it renders, so these are pure overhead. They
 * are kept in the editor and anywhere a block is actually used.
 */
function haven_dequeue_block_styles() {
	if ( is_admin() ) {
		return;
	}

	wp_dequeue_style( 'wp-block-library' );
	wp_dequeue_style( 'wp-block-library-theme' );
	wp_dequeue_style( 'global-styles' );
	wp_dequeue_style( 'classic-theme-styles' );
}
add_action( 'wp_enqueue_scripts', 'haven_dequeue_block_styles', 100 );

/**
 * Add `decoding="async"` to every image.
 *
 * Lazy-loading is deliberately left to core: `wp_get_loading_optimization_attributes()`
 * already skips the first in-viewport image, and it honours the explicit
 * `loading`/`fetchpriority` the hero and the first gallery slide pass in — so
 * forcing values here would only fight it and cost LCP.
 *
 * @param array $attr Attachment attributes.
 * @return array
 */
function haven_image_attributes( $attr ) {
	if ( empty( $attr['decoding'] ) ) {
		$attr['decoding'] = 'async';
	}

	return $attr;
}
add_filter( 'wp_get_attachment_image_attributes', 'haven_image_attributes' );

/**
 * Serve the property archive from the front page when it is set to "latest posts".
 *
 * @param array $classes Body classes.
 * @return array
 */
function haven_body_classes( $classes ) {
	if ( is_singular( 'property' ) ) {
		$classes[] = 'haven-single-property';
	}

	if ( haven_is_property_archive() ) {
		$classes[] = 'haven-property-archive';
	}

	return $classes;
}
add_filter( 'body_class', 'haven_body_classes' );

/**
 * Keep the excerpt a readable teaser rather than a wall of text.
 *
 * @return int
 */
function haven_excerpt_length() {
	return 28;
}
add_filter( 'excerpt_length', 'haven_excerpt_length' );

/**
 * Replace the excerpt ellipsis with a typographic one.
 *
 * @return string
 */
function haven_excerpt_more() {
	return '…';
}
add_filter( 'excerpt_more', 'haven_excerpt_more' );

/**
 * Point search engines at the sitemap and keep them out of admin-only paths.
 *
 * WordPress core already generates /wp-sitemap.xml for the public Property
 * post type and its taxonomies, so no sitemap plugin is needed.
 *
 * @param string $output Existing robots.txt body.
 * @param bool   $public Whether the site is set to be indexed.
 * @return string
 */
function haven_robots_txt( $output, $public ) {
	if ( ! $public ) {
		return $output;
	}

	$lines = array(
		'User-agent: *',
		'Allow: /wp-admin/admin-ajax.php',
		'Disallow: /wp-admin/',
		'Disallow: /?s=',
		'Disallow: /*?haven_status=',
		'',
		'Sitemap: ' . esc_url( home_url( '/wp-sitemap.xml' ) ),
	);

	return implode( "\n", $lines ) . "\n";
}
add_filter( 'robots_txt', 'haven_robots_txt', 10, 2 );

/**
 * Register the sidebar used on standard pages and posts.
 */
function haven_widgets_init() {
	register_sidebar(
		array(
			'name'          => __( 'Page Sidebar', 'haven' ),
			'id'            => 'sidebar-1',
			'description'   => __( 'Appears beside standard pages and blog posts.', 'haven' ),
			'before_widget' => '<section id="%1$s" class="widget %2$s">',
			'after_widget'  => '</section>',
			'before_title'  => '<h2 class="widget-title">',
			'after_title'   => '</h2>',
		)
	);
}
add_action( 'widgets_init', 'haven_widgets_init' );

<?php
/**
 * Environment detection, head trimming and first-run scaffolding.
 *
 * The theme renders storefront content that WooCommerce owns and testimonial
 * and newsletter content that the Marketly Core plugin owns. Neither is
 * assumed: every entry point checks first and degrades to a clear message
 * rather than fataling.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether WooCommerce is active.
 *
 * Cached per request — this is called from card, header and section templates
 * inside loops, so it must stay cheap.
 *
 * @return bool
 */
function marketly_has_woocommerce() {
	static $active = null;

	if ( null === $active ) {
		$active = class_exists( 'WooCommerce' );
	}

	return $active;
}

/**
 * Whether the Marketly Core data plugin is active.
 *
 * @return bool
 */
function marketly_core_active() {
	return defined( 'MARKETLY_CORE_VERSION' );
}

/**
 * Tell the site owner what is missing, in wp-admin only.
 *
 * Never shown on the front end, and only to users who could act on it.
 */
function marketly_dependency_notice() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}

	if ( ! marketly_has_woocommerce() ) {
		printf(
			'<div class="notice notice-error"><p><strong>%s</strong> %s</p></div>',
			esc_html__( 'Marketly theme:', 'marketly' ),
			esc_html__( 'WooCommerce is not active. The storefront, product cards, cart and checkout all need it. Install and activate WooCommerce under Plugins.', 'marketly' )
		);
	}

	if ( ! marketly_core_active() ) {
		printf(
			'<div class="notice notice-warning"><p><strong>%s</strong> %s</p></div>',
			esc_html__( 'Marketly theme:', 'marketly' ),
			esc_html__( 'the “Marketly Core” plugin is not active. Testimonials, the newsletter form and the wishlist need it. Activate it under Plugins.', 'marketly' )
		);
	}
}
add_action( 'admin_notices', 'marketly_dependency_notice' );

/**
 * Remove head output the storefront does not use.
 *
 * Each of these prints markup or loads a script on every single page view.
 * None of them are used by this theme, and the emoji script in particular is
 * ~10KB of JS plus an inline blob for a feature modern browsers handle natively.
 */
function marketly_trim_head() {
	remove_action( 'wp_head', 'wp_generator' );
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
	remove_action( 'wp_head', 'wp_shortlink_wp_head' );
	remove_action( 'wp_head', 'adjacent_posts_rel_link_wp_head', 10 );

	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );
	remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
	remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
	remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
}
add_action( 'init', 'marketly_trim_head' );

/**
 * Drop the emoji settings from the TinyMCE plugin list left behind above.
 *
 * @param array $plugins Registered TinyMCE plugins.
 * @return array
 */
function marketly_disable_emoji_tinymce( $plugins ) {
	return is_array( $plugins ) ? array_diff( $plugins, array( 'wpemoji' ) ) : array();
}
add_filter( 'tiny_mce_plugins', 'marketly_disable_emoji_tinymce' );

/**
 * Preconnect only to origins the page actually uses.
 *
 * @param string[] $urls          Resource URLs.
 * @param string   $relation_type Link relation.
 * @return string[]
 */
function marketly_resource_hints( $urls, $relation_type ) {
	if ( 'dns-prefetch' === $relation_type ) {
		// Core adds s.w.org for emoji, which this theme has removed.
		$urls = array_filter(
			$urls,
			static function ( $url ) {
				$value = is_array( $url ) && isset( $url['href'] ) ? $url['href'] : $url;
				return ! is_string( $value ) || false === strpos( $value, 's.w.org' );
			}
		);
	}

	return $urls;
}
add_filter( 'wp_resource_hints', 'marketly_resource_hints', 10, 2 );

/**
 * Create the pages the storefront links to, once, on theme activation.
 *
 * Idempotent: an existing page with the same slug is reused rather than
 * duplicated, so re-activating the theme never litters the pages list.
 */
function marketly_first_run() {
	// Deliberately not gated on is_admin() or a capability check. Core fires
	// this from check_theme_switched() on the first page load after the
	// switch, and that call consumes its flag whether or not the request is
	// an admin one — so gating here would silently skip the scaffolding when
	// a visitor happens to hit the front end first. The switch itself already
	// required the switch_themes capability. The option below is what keeps
	// this idempotent.
	if ( get_option( 'marketly_first_run_done' ) ) {
		return;
	}

	$pages = array(
		'home'     => array(
			'title'    => __( 'Home', 'marketly' ),
			'template' => '',
		),
		'wishlist' => array(
			'title'    => __( 'Wishlist', 'marketly' ),
			'template' => 'template-wishlist.php',
		),
		'deals'    => array(
			'title'    => __( 'Deals', 'marketly' ),
			'template' => 'template-deals.php',
		),
	);

	$created = array();

	foreach ( $pages as $slug => $page ) {
		$existing = get_page_by_path( $slug );

		if ( $existing instanceof WP_Post ) {
			$created[ $slug ] = (int) $existing->ID;
			continue;
		}

		$id = wp_insert_post(
			array(
				'post_title'   => $page['title'],
				'post_name'    => $slug,
				'post_status'  => 'publish',
				'post_type'    => 'page',
				'post_content' => '',
			)
		);

		if ( ! is_wp_error( $id ) && $id ) {
			$created[ $slug ] = (int) $id;

			if ( $page['template'] ) {
				update_post_meta( $id, '_wp_page_template', $page['template'] );
			}
		}
	}

	if ( isset( $created['home'] ) ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $created['home'] );
	}

	// Pretty permalinks matter for product and category URLs; switch away from
	// plain only if the owner has not already chosen a structure.
	if ( '' === get_option( 'permalink_structure' ) ) {
		update_option( 'permalink_structure', '/%postname%/' );
		flush_rewrite_rules( false );
	}

	update_option( 'marketly_first_run_done', 1 );
}
add_action( 'after_switch_theme', 'marketly_first_run' );

/**
 * Let the owner re-run the first-run scaffolding after deleting the pages.
 */
function marketly_reset_first_run() {
	delete_option( 'marketly_first_run_done' );
}
add_action( 'switch_theme', 'marketly_reset_first_run' );

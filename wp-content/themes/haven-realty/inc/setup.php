<?php
/**
 * Theme activation and plugin dependency.
 *
 * The theme renders property data that the Haven Realty Core plugin owns. If
 * that plugin is missing the theme must degrade to a clear message rather than
 * fatal, so every entry point checks first.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether the data-layer plugin is active.
 *
 * @return bool
 */
function haven_core_active() {
	return class_exists( 'Haven_CPT' ) && function_exists( 'haven_field' );
}

/**
 * Tell the owner what to install, in wp-admin only.
 */
function haven_dependency_notice() {
	if ( haven_core_active() || ! current_user_can( 'activate_plugins' ) ) {
		return;
	}

	printf(
		'<div class="notice notice-error"><p><strong>%s</strong> %s</p></div>',
		esc_html__( 'Haven Realty theme:', 'haven' ),
		esc_html__( 'the “Haven Realty Core” plugin is not active. Property listings, inquiries and the catalog templates need it. Activate it under Plugins.', 'haven' )
	);
}
add_action( 'admin_notices', 'haven_dependency_notice' );

/**
 * Fallbacks so a missing plugin degrades instead of fataling.
 *
 * These mirror the plugin's signatures and return empty values. They are only
 * declared when the plugin is absent, so the real implementations always win.
 */
function haven_declare_fallbacks() {
	if ( haven_core_active() ) {
		return;
	}

	if ( ! function_exists( 'haven_field' ) ) {
		/**
		 * Stub: no property meta without the plugin.
		 *
		 * @return string
		 */
		function haven_field() {
			return '';
		}
	}

	if ( ! function_exists( 'haven_archive_url' ) ) {
		/**
		 * Stub: point at the conventional archive path.
		 *
		 * @param array $args Query args.
		 * @return string
		 */
		function haven_archive_url( $args = array() ) {
			$url = home_url( '/properties/' );

			return $args ? add_query_arg( $args, $url ) : $url;
		}
	}

	if ( ! function_exists( 'haven_get_price_display' ) ) {
		/**
		 * Stub.
		 *
		 * @return string
		 */
		function haven_get_price_display() {
			return '';
		}
	}

	if ( ! function_exists( 'haven_get_location' ) ) {
		/**
		 * Stub.
		 *
		 * @return string
		 */
		function haven_get_location() {
			return '';
		}
	}

	if ( ! function_exists( 'haven_get_full_address' ) ) {
		/**
		 * Stub.
		 *
		 * @return string
		 */
		function haven_get_full_address() {
			return '';
		}
	}

	if ( ! function_exists( 'haven_first_term' ) ) {
		/**
		 * Stub.
		 *
		 * @return string
		 */
		function haven_first_term() {
			return '';
		}
	}

	if ( ! function_exists( 'haven_term_list' ) ) {
		/**
		 * Stub.
		 *
		 * @return string
		 */
		function haven_term_list() {
			return '';
		}
	}

	if ( ! function_exists( 'haven_availability_label' ) ) {
		/**
		 * Stub.
		 *
		 * @return string
		 */
		function haven_availability_label() {
			return '';
		}
	}

	if ( ! function_exists( 'haven_price_per_sqft' ) ) {
		/**
		 * Stub.
		 *
		 * @return string
		 */
		function haven_price_per_sqft() {
			return '';
		}
	}

	if ( ! function_exists( 'haven_format_price' ) ) {
		/**
		 * Stub.
		 *
		 * @return string
		 */
		function haven_format_price() {
			return '';
		}
	}

	if ( ! function_exists( 'haven_get_summary' ) ) {
		/**
		 * Stub: fall back to the standard excerpt.
		 *
		 * @param int|null $post_id Post ID.
		 * @return string
		 */
		function haven_get_summary( $post_id = null ) {
			return (string) get_the_excerpt( $post_id );
		}
	}

	if ( ! function_exists( 'haven_get_gallery_ids' ) ) {
		/**
		 * Stub: no gallery without the plugin.
		 *
		 * @return array
		 */
		function haven_get_gallery_ids() {
			return array();
		}
	}

	if ( ! function_exists( 'haven_get_agent' ) ) {
		/**
		 * Stub: fall back to site identity.
		 *
		 * @return array
		 */
		function haven_get_agent() {
			return array(
				'name'     => get_bloginfo( 'name' ),
				'email'    => get_option( 'admin_email' ),
				'phone'    => '',
				'photo_id' => 0,
			);
		}
	}

	if ( ! function_exists( 'haven_is_rental' ) ) {
		/**
		 * Stub.
		 *
		 * @return bool
		 */
		function haven_is_rental() {
			return false;
		}
	}

	if ( ! function_exists( 'haven_currency' ) ) {
		/**
		 * Stub.
		 *
		 * @return array
		 */
		function haven_currency() {
			return array(
				'code'   => 'USD',
				'symbol' => '$',
			);
		}
	}
}
add_action( 'after_setup_theme', 'haven_declare_fallbacks', 1 );

/**
 * First-run scaffolding: create the pages the navigation expects.
 *
 * Runs once when the theme is activated. Existing pages are reused, nothing is
 * overwritten, and the owner can rename or delete any of it afterwards.
 */
function haven_first_run() {
	$pages = array(
		'home'    => array(
			'title'    => __( 'Home', 'haven' ),
			'template' => '',
		),
		'about'   => array(
			'title'    => __( 'About', 'haven' ),
			'template' => '',
		),
		'contact' => array(
			'title'    => __( 'Contact', 'haven' ),
			'template' => 'template-contact.php',
		),
		'saved'   => array(
			'title'    => __( 'Saved Properties', 'haven' ),
			'template' => 'template-saved.php',
		),
	);

	$created = array();

	foreach ( $pages as $slug => $page ) {
		$existing = get_posts(
			array(
				'post_type'      => 'page',
				'name'           => $slug,
				'post_status'    => array( 'publish', 'draft', 'private' ),
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);

		if ( $existing ) {
			$created[ $slug ] = (int) $existing[0];
			continue;
		}

		$page_id = wp_insert_post(
			array(
				'post_type'   => 'page',
				'post_name'   => $slug,
				'post_title'  => $page['title'],
				'post_status' => 'publish',
			)
		);

		if ( is_wp_error( $page_id ) || ! $page_id ) {
			continue;
		}

		if ( $page['template'] ) {
			update_post_meta( $page_id, '_wp_page_template', $page['template'] );
		}

		$created[ $slug ] = (int) $page_id;
	}

	// Point the site at the Home page so front-page.php is used.
	if ( isset( $created['home'] ) && 'page' !== get_option( 'show_on_front' ) ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $created['home'] );
	}

	// Pretty permalinks are required for /properties/luxury-villa/ to resolve.
	if ( ! get_option( 'permalink_structure' ) ) {
		update_option( 'permalink_structure', '/%postname%/' );
	}

	flush_rewrite_rules();

	haven_build_primary_menu( $created );
}
add_action( 'after_switch_theme', 'haven_first_run' );

/**
 * Build a starter primary menu so the header is populated on first load.
 *
 * @param array $pages Slug => page ID map.
 */
function haven_build_primary_menu( $pages ) {
	$menu_name = __( 'Primary Menu', 'haven' );

	if ( wp_get_nav_menu_object( $menu_name ) ) {
		return;
	}

	$menu_id = wp_create_nav_menu( $menu_name );

	if ( is_wp_error( $menu_id ) ) {
		return;
	}

	if ( isset( $pages['home'] ) ) {
		wp_update_nav_menu_item(
			$menu_id,
			0,
			array(
				'menu-item-title'     => __( 'Home', 'haven' ),
				'menu-item-object'    => 'page',
				'menu-item-object-id' => $pages['home'],
				'menu-item-type'      => 'post_type',
				'menu-item-status'    => 'publish',
			)
		);
	}

	$links = array(
		array( __( 'Properties', 'haven' ), haven_archive_url() ),
		array( __( 'Buy', 'haven' ), haven_archive_url( array( 'purpose' => 'for-sale' ) ) ),
		array( __( 'Rent', 'haven' ), haven_archive_url( array( 'purpose' => 'for-rent' ) ) ),
	);

	foreach ( $links as $link ) {
		wp_update_nav_menu_item(
			$menu_id,
			0,
			array(
				'menu-item-title'  => $link[0],
				'menu-item-url'    => $link[1],
				'menu-item-type'   => 'custom',
				'menu-item-status' => 'publish',
			)
		);
	}

	foreach ( array( 'about', 'saved', 'contact' ) as $slug ) {
		if ( ! isset( $pages[ $slug ] ) ) {
			continue;
		}

		wp_update_nav_menu_item(
			$menu_id,
			0,
			array(
				'menu-item-object'    => 'page',
				'menu-item-object-id' => $pages[ $slug ],
				'menu-item-type'      => 'post_type',
				'menu-item-status'    => 'publish',
			)
		);
	}

	$locations            = (array) get_theme_mod( 'nav_menu_locations', array() );
	$locations['primary'] = $menu_id;

	set_theme_mod( 'nav_menu_locations', $locations );
}

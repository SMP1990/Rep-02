<?php
/**
 * One-click demo content — the six listings from the original React build.
 *
 * Gives the owner a populated site to look at on day one. Images are pulled
 * into the Media Library so the site never hotlinks a third party; if the
 * import cannot reach them, the listing is still created without images.
 *
 * Tools → Haven Demo Content. Runs once, then offers to remove what it added.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

class Haven_Demo {

	const FLAG_META = '_haven_demo_content';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_page' ) );
		add_action( 'admin_post_haven_import_demo', array( __CLASS__, 'handle_import' ) );
		add_action( 'admin_post_haven_remove_demo', array( __CLASS__, 'handle_remove' ) );
	}

	/**
	 * Add the tool as a Properties submenu.
	 */
	public static function add_page() {
		add_submenu_page(
			'edit.php?post_type=' . Haven_CPT::POST_TYPE,
			__( 'Demo Content', 'haven' ),
			__( 'Demo Content', 'haven' ),
			'edit_properties',
			'haven-demo',
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * The six seed listings.
	 *
	 * @return array
	 */
	private static function listings() {
		return array(
			array(
				'title'     => 'Modern Oceanview Villa',
				'content'   => "Set against panoramic Pacific sunsets, this architectural masterpiece features floor-to-ceiling glass walls, an infinity edge pool overlooking the coast, custom Italian cabinetry, and an open-concept flow designed for premier entertaining.\n\nIncludes smart home automation, a private wine cellar, and direct private beach trail access.",
				'purpose'   => 'For Sale',
				'type'      => 'Villa',
				'location'  => array( 'California', 'Malibu' ),
				'amenities' => array( 'Infinity Pool', 'Ocean View', 'Smart Home System', 'Wine Cellar', 'Private Beach Access', "Chef's Kitchen", 'Outdoor Kitchen & BBQ', 'Electric Vehicle Charger', 'Spa / Hot Tub' ),
				'meta'      => array(
					'price'      => 3850000,
					'address'    => '28420 Pacific Coast Highway',
					'city'       => 'Malibu',
					'region'     => 'California',
					'postcode'   => '90265',
					'country'    => 'United States',
					'bedrooms'   => 4,
					'bathrooms'  => 4.5,
					'area_sqft'  => 3250,
					'year_built' => 2023,
					'garage'     => 3,
					'featured'   => 1,
				),
				'images'    => array(
					'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80',
					'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
					'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80',
				),
			),
			array(
				'title'     => 'Luxury Downtown Residence',
				'content'   => "An oasis in the centre of Brickell Miami, this ultra-modern glass sanctuary provides sweeping city skyline views.\n\nBoasting custom European finishes, herringbone French oak flooring, a cantilevered private balcony, and 24/7 white-glove concierge service.",
				'purpose'   => 'For Sale',
				'type'      => 'House',
				'location'  => array( 'Florida', 'Miami' ),
				'amenities' => array( 'City Skyline View', 'Balcony / Terrace', 'Concierge Service', 'Fitness Center', 'Private Elevator' ),
				'meta'      => array(
					'price'      => 2450000,
					'address'    => '1450 Brickell Bay Drive',
					'city'       => 'Miami',
					'region'     => 'Florida',
					'postcode'   => '33131',
					'country'    => 'United States',
					'bedrooms'   => 3,
					'bathrooms'  => 3,
					'area_sqft'  => 2100,
					'year_built' => 2022,
					'garage'     => 2,
					'featured'   => 1,
				),
				'images'    => array(
					'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80',
					'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=80',
				),
			),
			array(
				'title'     => 'Beachfront Penthouse',
				'content'   => 'A full-floor penthouse with wraparound terraces over the Atlantic, private elevator entry, and resort-grade amenities on the doorstep.',
				'purpose'   => 'For Rent',
				'type'      => 'Penthouse',
				'location'  => array( 'Florida', 'Fort Lauderdale' ),
				'amenities' => array( 'Ocean View', 'Balcony / Terrace', 'Private Elevator', 'Concierge Service', 'Fitness Center' ),
				'meta'      => array(
					'price'        => 8500,
					'price_period' => 'month',
					'address'      => '2100 North Ocean Boulevard',
					'city'         => 'Fort Lauderdale',
					'region'       => 'Florida',
					'postcode'     => '33305',
					'country'      => 'United States',
					'bedrooms'     => 2,
					'bathrooms'    => 2.5,
					'area_sqft'    => 1800,
					'year_built'   => 2021,
					'garage'       => 2,
					'featured'     => 1,
				),
				'images'    => array(
					'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80',
					'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80',
				),
			),
			array(
				'title'     => 'The Bel Air Modern Estate',
				'content'   => 'A gated compound behind mature olive trees, with a 60-foot lap pool, screening room, staff quarters and city-to-ocean views from every principal room.',
				'purpose'   => 'For Sale',
				'type'      => 'Estate',
				'location'  => array( 'California', 'Bel Air' ),
				'amenities' => array( 'Gated Community', 'Home Theater', 'Infinity Pool', 'Wine Cellar', 'Smart Home System', 'Tennis Court', 'Sauna & Steam Room' ),
				'meta'      => array(
					'price'      => 12900000,
					'address'    => '755 Stradella Road',
					'city'       => 'Bel Air',
					'region'     => 'California',
					'postcode'   => '90077',
					'country'    => 'United States',
					'bedrooms'   => 6,
					'bathrooms'  => 7.5,
					'area_sqft'  => 8400,
					'year_built' => 2020,
					'garage'     => 4,
					'featured'   => 0,
				),
				'images'    => array(
					'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=80',
					'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80',
				),
			),
			array(
				'title'     => 'Aspen Alpine Chalet',
				'content'   => 'Reclaimed timber and glass on a south-facing slope, ski-in access, a two-storey stone hearth and a spa level built into the mountain.',
				'purpose'   => 'For Sale',
				'type'      => 'Chalet',
				'location'  => array( 'Colorado', 'Aspen' ),
				'amenities' => array( 'Mountain Views', 'Spa / Hot Tub', 'Sauna & Steam Room', 'Heated Driveway', 'Wine Cellar', 'Home Theater' ),
				'meta'      => array(
					'price'      => 6750000,
					'address'    => '1201 Red Mountain Road',
					'city'       => 'Aspen',
					'region'     => 'Colorado',
					'postcode'   => '81611',
					'country'    => 'United States',
					'bedrooms'   => 5,
					'bathrooms'  => 5,
					'area_sqft'  => 4600,
					'year_built' => 2019,
					'garage'     => 3,
					'featured'   => 0,
				),
				'images'    => array(
					'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=80',
					'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1600&q=80',
				),
			),
			array(
				'title'     => 'Tribeca Architectural Loft',
				'content'   => 'A cast-iron conversion with 14-foot ceilings, original columns, a chef’s kitchen by Boffi and a keyed elevator opening directly into the residence.',
				'purpose'   => 'For Rent',
				'type'      => 'Apartment',
				'location'  => array( 'New York', 'Tribeca' ),
				'amenities' => array( 'Private Elevator', "Chef's Kitchen", 'City Skyline View', 'Concierge Service', 'Fitness Center' ),
				'meta'      => array(
					'price'        => 14000,
					'price_period' => 'month',
					'address'      => '55 Franklin Street',
					'city'         => 'New York',
					'region'       => 'New York',
					'postcode'     => '10013',
					'country'      => 'United States',
					'bedrooms'     => 3,
					'bathrooms'    => 3.5,
					'area_sqft'    => 2900,
					'year_built'   => 1901,
					'garage'       => 0,
					'featured'     => 0,
				),
				'images'    => array(
					'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1600&q=80',
					'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80',
				),
			),
		);
	}

	/**
	 * Count the demo listings currently in the database.
	 *
	 * @return int
	 */
	private static function existing_count() {
		$posts = get_posts(
			array(
				'post_type'      => Haven_CPT::POST_TYPE,
				'post_status'    => 'any',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
				'meta_key'       => self::FLAG_META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => '1', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			)
		);

		return count( $posts );
	}

	/**
	 * Render the tool screen.
	 */
	public static function render_page() {
		if ( ! current_user_can( 'edit_properties' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage properties.', 'haven' ) );
		}

		$count = self::existing_count();

		echo '<div class="wrap"><h1>' . esc_html__( 'Haven Demo Content', 'haven' ) . '</h1>';

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display-only notice.
		$notice = isset( $_GET['haven_demo'] ) ? sanitize_key( wp_unslash( $_GET['haven_demo'] ) ) : '';

		if ( 'imported' === $notice ) {
			echo '<div class="notice notice-success"><p>' . esc_html__( 'Demo properties imported.', 'haven' ) . '</p></div>';
		} elseif ( 'removed' === $notice ) {
			echo '<div class="notice notice-success"><p>' . esc_html__( 'Demo properties removed.', 'haven' ) . '</p></div>';
		}

		echo '<p>' . esc_html__( 'Import six sample luxury listings — with taxonomies, specs and gallery images — so you can see the site fully populated before adding your own. Images are copied into your Media Library.', 'haven' ) . '</p>';

		if ( $count ) {
			printf(
				'<p><strong>%s</strong></p>',
				esc_html(
					sprintf(
						/* translators: %d: number of demo listings */
						_n( '%d demo listing is currently installed.', '%d demo listings are currently installed.', $count, 'haven' ),
						$count
					)
				)
			);
		}

		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" style="display:inline-block;margin-right:10px">';
		wp_nonce_field( 'haven_import_demo' );
		echo '<input type="hidden" name="action" value="haven_import_demo">';
		submit_button( __( 'Import demo properties', 'haven' ), 'primary', 'submit', false );
		echo '</form>';

		if ( $count ) {
			echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" style="display:inline-block">';
			wp_nonce_field( 'haven_remove_demo' );
			echo '<input type="hidden" name="action" value="haven_remove_demo">';
			submit_button( __( 'Remove demo properties', 'haven' ), 'delete', 'submit', false );
			echo '</form>';
		}

		echo '</div>';
	}

	/**
	 * Import handler.
	 */
	public static function handle_import() {
		check_admin_referer( 'haven_import_demo' );

		if ( ! current_user_can( 'edit_properties' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage properties.', 'haven' ) );
		}

		Haven_CPT::seed_default_terms();

		foreach ( self::listings() as $listing ) {
			self::import_one( $listing );
		}

		wp_safe_redirect(
			add_query_arg(
				array(
					'post_type'  => Haven_CPT::POST_TYPE,
					'page'       => 'haven-demo',
					'haven_demo' => 'imported',
				),
				admin_url( 'edit.php' )
			)
		);
		exit;
	}

	/**
	 * Create one demo listing.
	 *
	 * @param array $listing Listing definition.
	 */
	private static function import_one( $listing ) {
		// Re-running the import must not duplicate listings.
		$duplicate = get_posts(
			array(
				'post_type'      => Haven_CPT::POST_TYPE,
				'post_status'    => 'any',
				'title'          => $listing['title'],
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);

		if ( $duplicate ) {
			return;
		}

		$post_id = wp_insert_post(
			array(
				'post_type'    => Haven_CPT::POST_TYPE,
				'post_status'  => 'publish',
				'post_title'   => $listing['title'],
				'post_content' => $listing['content'],
			),
			true
		);

		if ( is_wp_error( $post_id ) ) {
			return;
		}

		update_post_meta( $post_id, self::FLAG_META, '1' );

		foreach ( Haven_Meta::schema() as $key => $field ) {
			$value = isset( $listing['meta'][ $key ] ) ? $listing['meta'][ $key ] : $field['default'];

			if ( '' === $value ) {
				continue;
			}

			update_post_meta( $post_id, Haven_Meta::PREFIX . $key, Haven_Meta::sanitize_value( $value, $field ) );
		}

		wp_set_object_terms( $post_id, $listing['purpose'], Haven_CPT::TAX_PURPOSE );
		wp_set_object_terms( $post_id, $listing['type'], Haven_CPT::TAX_TYPE );
		wp_set_object_terms( $post_id, $listing['amenities'], Haven_CPT::TAX_AMENITY );
		self::set_location( $post_id, $listing['location'] );

		self::attach_images( $post_id, $listing['images'], $listing['title'] );
	}

	/**
	 * Assign a nested State → City location.
	 *
	 * @param int      $post_id Property ID.
	 * @param string[] $path    [ state, city ].
	 */
	private static function set_location( $post_id, $path ) {
		$parent_id = 0;
		$term_ids  = array();

		foreach ( $path as $name ) {
			$existing = term_exists( $name, Haven_CPT::TAX_LOCATION, $parent_id );

			if ( ! $existing ) {
				$existing = wp_insert_term( $name, Haven_CPT::TAX_LOCATION, array( 'parent' => $parent_id ) );
			}

			if ( is_wp_error( $existing ) ) {
				return;
			}

			$parent_id  = (int) $existing['term_id'];
			$term_ids[] = $parent_id;
		}

		wp_set_object_terms( $post_id, $term_ids, Haven_CPT::TAX_LOCATION );
	}

	/**
	 * Sideload the demo images and wire up the featured image plus gallery.
	 *
	 * @param int      $post_id Property ID.
	 * @param string[] $urls    Remote image URLs.
	 * @param string   $title   Listing title, used for alt text.
	 */
	private static function attach_images( $post_id, $urls, $title ) {
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$ids = array();

		foreach ( $urls as $index => $url ) {
			$attachment_id = media_sideload_image( $url, $post_id, $title, 'id' );

			if ( is_wp_error( $attachment_id ) ) {
				continue;
			}

			update_post_meta( $attachment_id, '_wp_attachment_image_alt', $title );
			$ids[] = (int) $attachment_id;

			if ( 0 === $index ) {
				set_post_thumbnail( $post_id, $attachment_id );
			}
		}

		if ( $ids ) {
			update_post_meta( $post_id, Haven_Meta::PREFIX . 'gallery', implode( ',', $ids ) );
		}
	}

	/**
	 * Remove every listing this tool created, along with its attachments.
	 */
	public static function handle_remove() {
		check_admin_referer( 'haven_remove_demo' );

		if ( ! current_user_can( 'delete_properties' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage properties.', 'haven' ) );
		}

		$posts = get_posts(
			array(
				'post_type'      => Haven_CPT::POST_TYPE,
				'post_status'    => 'any',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'meta_key'       => self::FLAG_META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => '1', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			)
		);

		foreach ( $posts as $post_id ) {
			foreach ( get_attached_media( 'image', $post_id ) as $attachment ) {
				wp_delete_attachment( $attachment->ID, true );
			}

			wp_delete_post( $post_id, true );
		}

		wp_safe_redirect(
			add_query_arg(
				array(
					'post_type'  => Haven_CPT::POST_TYPE,
					'page'       => 'haven-demo',
					'haven_demo' => 'removed',
				),
				admin_url( 'edit.php' )
			)
		);
		exit;
	}
}

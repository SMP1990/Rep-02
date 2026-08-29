<?php
/**
 * Property post type and its taxonomies.
 *
 * URL shapes produced here:
 *   /properties/                      archive
 *   /properties/luxury-villa/         single listing
 *   /property-type/villa/             type archive
 *   /location/malibu/                 location archive
 *   /purpose/for-sale/                sale vs rent archive
 *   /amenity/infinity-pool/           amenity archive
 *
 * All of the above are public and therefore picked up automatically by the
 * WordPress core sitemap at /wp-sitemap.xml — no SEO plugin required.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

class Haven_CPT {

	const POST_TYPE = 'property';

	const TAX_TYPE     = 'property_type';
	const TAX_LOCATION = 'property_location';
	const TAX_PURPOSE  = 'property_purpose';
	const TAX_AMENITY  = 'property_amenity';

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_types' ), 5 );
		add_action( 'init', array( __CLASS__, 'register_taxonomies' ), 6 );
		add_action( 'admin_init', array( 'Haven_Caps', 'maybe_upgrade' ) );
	}

	/**
	 * Register the Property post type with its own admin-only capability set.
	 */
	public static function register_post_types() {
		$labels = array(
			'name'                  => _x( 'Properties', 'post type general name', 'haven' ),
			'singular_name'         => _x( 'Property', 'post type singular name', 'haven' ),
			'menu_name'             => _x( 'Properties', 'admin menu', 'haven' ),
			'add_new'               => __( 'Add Property', 'haven' ),
			'add_new_item'          => __( 'Add New Property', 'haven' ),
			'edit_item'             => __( 'Edit Property', 'haven' ),
			'new_item'              => __( 'New Property', 'haven' ),
			'view_item'             => __( 'View Property', 'haven' ),
			'view_items'            => __( 'View Properties', 'haven' ),
			'search_items'          => __( 'Search Properties', 'haven' ),
			'not_found'             => __( 'No properties found.', 'haven' ),
			'not_found_in_trash'    => __( 'No properties found in Trash.', 'haven' ),
			'all_items'             => __( 'All Properties', 'haven' ),
			'archives'              => __( 'Property Archives', 'haven' ),
			'featured_image'        => __( 'Primary Image', 'haven' ),
			'set_featured_image'    => __( 'Set primary image', 'haven' ),
			'remove_featured_image' => __( 'Remove primary image', 'haven' ),
			'use_featured_image'    => __( 'Use as primary image', 'haven' ),
			'item_published'        => __( 'Property published.', 'haven' ),
			'item_updated'          => __( 'Property updated.', 'haven' ),
		);

		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => $labels,
				'description'         => __( 'Luxury property listings managed by the site owner.', 'haven' ),
				'public'              => true,
				'publicly_queryable'  => true,
				'show_ui'             => true,
				'show_in_menu'        => true,
				'show_in_nav_menus'   => true,
				'show_in_admin_bar'   => true,
				'show_in_rest'        => false, // Classic meta boxes; no block editor for listings.
				'menu_position'       => 4,
				'menu_icon'           => 'dashicons-admin-multisite',
				'hierarchical'        => false,
				'has_archive'         => 'properties',
				'rewrite'             => array(
					'slug'       => 'properties',
					'with_front' => false,
					'feeds'      => true,
					'pages'      => true,
				),
				'query_var'           => true,
				'exclude_from_search' => false,
				'supports'            => array( 'title', 'editor', 'thumbnail', 'excerpt', 'revisions', 'page-attributes' ),
				'capability_type'     => array( 'property', 'properties' ),
				'map_meta_cap'        => true,
				'delete_with_user'    => false,
			)
		);
	}

	/**
	 * Register the four property taxonomies.
	 *
	 * All are hierarchical so the admin gets a checkbox list (no accidental
	 * free-text duplicates like "Malibu" vs "malibu, CA") and so Location can
	 * nest City under State.
	 */
	public static function register_taxonomies() {
		$shared = array(
			'public'             => true,
			'publicly_queryable' => true,
			'hierarchical'       => true,
			'show_ui'            => true,
			'show_admin_column'  => true,
			'show_in_nav_menus'  => true,
			'show_in_rest'       => false,
			'capabilities'       => array(
				'manage_terms' => 'edit_properties',
				'edit_terms'   => 'edit_properties',
				'delete_terms' => 'edit_properties',
				'assign_terms' => 'edit_properties',
			),
		);

		register_taxonomy(
			self::TAX_TYPE,
			self::POST_TYPE,
			array_merge(
				$shared,
				array(
					'labels'  => self::tax_labels( __( 'Property Types', 'haven' ), __( 'Property Type', 'haven' ) ),
					'rewrite' => array(
						'slug'       => 'property-type',
						'with_front' => false,
					),
				)
			)
		);

		register_taxonomy(
			self::TAX_LOCATION,
			self::POST_TYPE,
			array_merge(
				$shared,
				array(
					'labels'  => self::tax_labels( __( 'Locations', 'haven' ), __( 'Location', 'haven' ) ),
					'rewrite' => array(
						'slug'         => 'location',
						'with_front'   => false,
						'hierarchical' => true,
					),
				)
			)
		);

		register_taxonomy(
			self::TAX_PURPOSE,
			self::POST_TYPE,
			array_merge(
				$shared,
				array(
					'labels'  => self::tax_labels( __( 'Purposes', 'haven' ), __( 'Purpose', 'haven' ) ),
					'rewrite' => array(
						'slug'       => 'purpose',
						'with_front' => false,
					),
				)
			)
		);

		register_taxonomy(
			self::TAX_AMENITY,
			self::POST_TYPE,
			array_merge(
				$shared,
				array(
					'labels'            => self::tax_labels( __( 'Amenities', 'haven' ), __( 'Amenity', 'haven' ) ),
					'show_admin_column' => false,
					'rewrite'           => array(
						'slug'       => 'amenity',
						'with_front' => false,
					),
				)
			)
		);
	}

	/**
	 * Build a taxonomy label array from a plural and singular name.
	 *
	 * @param string $plural   Plural label.
	 * @param string $singular Singular label.
	 * @return array
	 */
	private static function tax_labels( $plural, $singular ) {
		return array(
			'name'              => $plural,
			'singular_name'     => $singular,
			'search_items'      => sprintf( /* translators: %s: plural taxonomy label */ __( 'Search %s', 'haven' ), $plural ),
			'all_items'         => sprintf( /* translators: %s: plural taxonomy label */ __( 'All %s', 'haven' ), $plural ),
			'parent_item'       => sprintf( /* translators: %s: singular taxonomy label */ __( 'Parent %s', 'haven' ), $singular ),
			'parent_item_colon' => sprintf( /* translators: %s: singular taxonomy label */ __( 'Parent %s:', 'haven' ), $singular ),
			'edit_item'         => sprintf( /* translators: %s: singular taxonomy label */ __( 'Edit %s', 'haven' ), $singular ),
			'update_item'       => sprintf( /* translators: %s: singular taxonomy label */ __( 'Update %s', 'haven' ), $singular ),
			'add_new_item'      => sprintf( /* translators: %s: singular taxonomy label */ __( 'Add New %s', 'haven' ), $singular ),
			'new_item_name'     => sprintf( /* translators: %s: singular taxonomy label */ __( 'New %s Name', 'haven' ), $singular ),
			'menu_name'         => $plural,
			'not_found'         => sprintf( /* translators: %s: plural taxonomy label */ __( 'No %s found.', 'haven' ), strtolower( $plural ) ),
		);
	}

	/**
	 * Create the starter vocabulary on activation so the admin has something to
	 * pick from immediately. Existing terms are never overwritten.
	 */
	public static function seed_default_terms() {
		$defaults = array(
			self::TAX_PURPOSE => array( 'For Sale', 'For Rent' ),
			self::TAX_TYPE    => array( 'Villa', 'Penthouse', 'Apartment', 'House', 'Townhouse', 'Mansion', 'Chalet', 'Estate' ),
			self::TAX_AMENITY => array(
				'Infinity Pool',
				'Ocean View',
				'City Skyline View',
				'Mountain Views',
				'Smart Home System',
				'Wine Cellar',
				"Chef's Kitchen",
				'Private Beach Access',
				'Balcony / Terrace',
				'Private Elevator',
				'Home Theater',
				'Spa / Hot Tub',
				'Sauna & Steam Room',
				'Tennis Court',
				'Fitness Center',
				'Outdoor Kitchen & BBQ',
				'Gated Community',
				'Electric Vehicle Charger',
				'Concierge Service',
				'Heated Driveway',
			),
		);

		foreach ( $defaults as $taxonomy => $terms ) {
			foreach ( $terms as $term ) {
				if ( ! term_exists( $term, $taxonomy ) ) {
					wp_insert_term( $term, $taxonomy );
				}
			}
		}
	}
}

<?php
/**
 * Property meta fields — the schema, registration and sanitisation.
 *
 * Every field is registered with `register_post_meta()` so it has a declared
 * type, a sanitise callback and an auth callback that refuses anyone without
 * `edit_properties`. The meta boxes in class-haven-admin.php render this same
 * schema, so adding a field here adds it to the editor.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

class Haven_Meta {

	const PREFIX = '_haven_';

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_meta' ), 7 );
	}

	/**
	 * The single source of truth for property fields.
	 *
	 * @return array<string, array>
	 */
	public static function schema() {
		return array(
			// --- Pricing -------------------------------------------------.
			'price'          => array(
				'label'   => __( 'Price', 'haven' ),
				'type'    => 'number',
				'group'   => 'pricing',
				'min'     => 0,
				'step'    => '1',
				'desc'    => __( 'Numbers only — formatting is applied on the front end.', 'haven' ),
				'default' => '',
			),
			'price_period'   => array(
				'label'   => __( 'Price Period', 'haven' ),
				'type'    => 'select',
				'group'   => 'pricing',
				'options' => array(
					''        => __( 'One-off (for sale)', 'haven' ),
					'month'   => __( 'Per month', 'haven' ),
					'week'    => __( 'Per week', 'haven' ),
					'night'   => __( 'Per night', 'haven' ),
				),
				'default' => '',
			),
			'price_on_request' => array(
				'label'   => __( 'Price on request', 'haven' ),
				'type'    => 'checkbox',
				'group'   => 'pricing',
				'desc'    => __( 'Hide the figure and show “Price on Request” instead.', 'haven' ),
				'default' => 0,
			),

			// --- Address -------------------------------------------------.
			'address'        => array(
				'label'   => __( 'Street Address', 'haven' ),
				'type'    => 'text',
				'group'   => 'address',
				'default' => '',
			),
			'city'           => array(
				'label'   => __( 'City', 'haven' ),
				'type'    => 'text',
				'group'   => 'address',
				'default' => '',
			),
			'region'         => array(
				'label'   => __( 'State / Region', 'haven' ),
				'type'    => 'text',
				'group'   => 'address',
				'default' => '',
			),
			'postcode'       => array(
				'label'   => __( 'ZIP / Postcode', 'haven' ),
				'type'    => 'text',
				'group'   => 'address',
				'default' => '',
			),
			'country'        => array(
				'label'   => __( 'Country', 'haven' ),
				'type'    => 'text',
				'group'   => 'address',
				'default' => '',
			),

			// --- Specification -------------------------------------------.
			'bedrooms'       => array(
				'label'   => __( 'Bedrooms', 'haven' ),
				'type'    => 'number',
				'group'   => 'specs',
				'min'     => 0,
				'step'    => '1',
				'default' => '',
			),
			'bathrooms'      => array(
				'label'   => __( 'Bathrooms', 'haven' ),
				'type'    => 'number',
				'group'   => 'specs',
				'min'     => 0,
				'step'    => '0.5',
				'desc'    => __( 'Half-baths allowed, e.g. 4.5', 'haven' ),
				'default' => '',
			),
			'area_sqft'      => array(
				'label'   => __( 'Area (sq ft)', 'haven' ),
				'type'    => 'number',
				'group'   => 'specs',
				'min'     => 0,
				'step'    => '1',
				'default' => '',
			),
			'lot_sqft'       => array(
				'label'   => __( 'Lot Size (sq ft)', 'haven' ),
				'type'    => 'number',
				'group'   => 'specs',
				'min'     => 0,
				'step'    => '1',
				'default' => '',
			),
			'year_built'     => array(
				'label'   => __( 'Year Built', 'haven' ),
				'type'    => 'number',
				'group'   => 'specs',
				'min'     => 1500,
				'step'    => '1',
				'default' => '',
			),
			'garage'         => array(
				'label'   => __( 'Garage Spaces', 'haven' ),
				'type'    => 'number',
				'group'   => 'specs',
				'min'     => 0,
				'step'    => '1',
				'default' => '',
			),

			// --- Presentation --------------------------------------------.
			'featured'       => array(
				'label'   => __( 'Featured property', 'haven' ),
				'type'    => 'checkbox',
				'group'   => 'status',
				'desc'    => __( 'Featured listings lead the home page and sort first in the catalog.', 'haven' ),
				'default' => 0,
			),
			'availability'   => array(
				'label'   => __( 'Availability', 'haven' ),
				'type'    => 'select',
				'group'   => 'status',
				'options' => array(
					'active'  => __( 'Active', 'haven' ),
					'pending' => __( 'Under Offer / Pending', 'haven' ),
					'sold'    => __( 'Sold', 'haven' ),
					'rented'  => __( 'Rented', 'haven' ),
				),
				'default' => 'active',
			),
			'gallery'        => array(
				'label'   => __( 'Gallery', 'haven' ),
				'type'    => 'gallery',
				'group'   => 'gallery',
				'default' => '',
			),
			'video_url'      => array(
				'label'   => __( 'Video URL', 'haven' ),
				'type'    => 'url',
				'group'   => 'gallery',
				'desc'    => __( 'YouTube or Vimeo link. Loaded only when a visitor presses play.', 'haven' ),
				'default' => '',
			),

			// --- Listing representative ----------------------------------.
			'agent_name'     => array(
				'label'   => __( 'Agent Name', 'haven' ),
				'type'    => 'text',
				'group'   => 'agent',
				'desc'    => __( 'Leave blank to use the site-wide default from Appearance → Customize.', 'haven' ),
				'default' => '',
			),
			'agent_email'    => array(
				'label'   => __( 'Agent Email', 'haven' ),
				'type'    => 'email',
				'group'   => 'agent',
				'default' => '',
			),
			'agent_phone'    => array(
				'label'   => __( 'Agent Phone', 'haven' ),
				'type'    => 'text',
				'group'   => 'agent',
				'default' => '',
			),
			'agent_photo_id' => array(
				'label'   => __( 'Agent Photo', 'haven' ),
				'type'    => 'image',
				'group'   => 'agent',
				'default' => 0,
			),

			// --- SEO overrides -------------------------------------------.
			'seo_title'      => array(
				'label'   => __( 'SEO Title', 'haven' ),
				'type'    => 'text',
				'group'   => 'seo',
				'desc'    => __( 'Overrides the browser/search-result title. Aim for under 60 characters.', 'haven' ),
				'default' => '',
			),
			'seo_description' => array(
				'label'   => __( 'Meta Description', 'haven' ),
				'type'    => 'textarea',
				'group'   => 'seo',
				'desc'    => __( 'Falls back to the excerpt, then a generated summary. Aim for 150–160 characters.', 'haven' ),
				'default' => '',
			),
			'seo_noindex'    => array(
				'label'   => __( 'Hide from search engines', 'haven' ),
				'type'    => 'checkbox',
				'group'   => 'seo',
				'desc'    => __( 'Adds noindex. Use for off-market or pocket listings.', 'haven' ),
				'default' => 0,
			),
		);
	}

	/**
	 * Register every schema field with WordPress.
	 */
	public static function register_meta() {
		foreach ( self::schema() as $key => $field ) {
			register_post_meta(
				Haven_CPT::POST_TYPE,
				self::PREFIX . $key,
				array(
					'type'              => in_array( $field['type'], array( 'number', 'checkbox', 'image' ), true ) ? 'number' : 'string',
					'single'            => true,
					'show_in_rest'      => false,
					'sanitize_callback' => static function ( $value ) use ( $field ) {
						return self::sanitize_value( $value, $field );
					},
					'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
						return current_user_can( 'edit_property', $post_id );
					},
				)
			);
		}
	}

	/**
	 * Sanitise one submitted value according to its field definition.
	 *
	 * @param mixed $value Raw value.
	 * @param array $field Field definition.
	 * @return mixed
	 */
	public static function sanitize_value( $value, $field ) {
		switch ( $field['type'] ) {
			case 'number':
				if ( '' === $value || null === $value ) {
					return '';
				}
				return 0 + preg_replace( '/[^0-9.\-]/', '', (string) $value );

			case 'checkbox':
				return empty( $value ) ? 0 : 1;

			case 'image':
				return absint( $value );

			case 'email':
				return sanitize_email( $value );

			case 'url':
				return esc_url_raw( $value );

			case 'textarea':
				return sanitize_textarea_field( $value );

			case 'select':
				$options = isset( $field['options'] ) ? array_keys( $field['options'] ) : array();
				$value   = sanitize_text_field( $value );
				return in_array( $value, $options, true ) ? $value : $field['default'];

			case 'gallery':
				$ids = array_filter( array_map( 'absint', explode( ',', (string) $value ) ) );
				return implode( ',', $ids );

			default:
				return sanitize_text_field( $value );
		}
	}

	/**
	 * Read one property field, falling back to its declared default.
	 *
	 * @param int    $post_id Property ID.
	 * @param string $key     Field key without the prefix.
	 * @return mixed
	 */
	public static function get( $post_id, $key ) {
		$schema = self::schema();
		$value  = get_post_meta( $post_id, self::PREFIX . $key, true );

		if ( '' === $value || null === $value ) {
			return isset( $schema[ $key ]['default'] ) ? $schema[ $key ]['default'] : '';
		}

		return $value;
	}
}

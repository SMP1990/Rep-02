<?php
/**
 * Template-facing helpers.
 *
 * These are what the theme calls. Keeping them here means the theme never
 * touches meta keys directly, so the storage shape can change without
 * rewriting templates.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

/**
 * Read one property field.
 *
 * @param string   $key     Field key without the `_haven_` prefix.
 * @param int|null $post_id Property ID, defaults to the current post.
 * @return mixed
 */
function haven_field( $key, $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();

	return Haven_Meta::get( $post_id, $key );
}

/**
 * Currency code and symbol, set once in the Customizer.
 *
 * @return array{code:string,symbol:string}
 */
function haven_currency() {
	$code = get_theme_mod( 'haven_currency_code', 'USD' );

	$symbols = array(
		'USD' => '$',
		'EUR' => '€',
		'GBP' => '£',
		'AED' => 'AED ',
		'PKR' => 'Rs ',
		'AUD' => 'A$',
		'CAD' => 'C$',
	);

	return array(
		'code'   => $code,
		'symbol' => isset( $symbols[ $code ] ) ? $symbols[ $code ] : '$',
	);
}

/**
 * Format a raw number as a price.
 *
 * @param float|string $amount Raw amount.
 * @return string
 */
function haven_format_price( $amount ) {
	$currency = haven_currency();

	return $currency['symbol'] . number_format_i18n( (float) $amount, 0 );
}

/**
 * Human-readable price for a property, including any rental period.
 *
 * @param int|null $post_id Property ID.
 * @return string
 */
function haven_get_price_display( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();

	if ( haven_field( 'price_on_request', $post_id ) ) {
		return __( 'Price on Request', 'haven' );
	}

	$price = haven_field( 'price', $post_id );

	if ( '' === $price || null === $price ) {
		return __( 'Price on Request', 'haven' );
	}

	$formatted = haven_format_price( $price );
	$period    = haven_field( 'price_period', $post_id );

	$suffixes = array(
		'month' => __( '/ month', 'haven' ),
		'week'  => __( '/ week', 'haven' ),
		'night' => __( '/ night', 'haven' ),
	);

	if ( $period && isset( $suffixes[ $period ] ) ) {
		return $formatted . ' ' . $suffixes[ $period ];
	}

	return $formatted;
}

/**
 * Gallery attachment IDs, with the featured image always first.
 *
 * @param int|null $post_id Property ID.
 * @return int[]
 */
function haven_get_gallery_ids( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();

	$ids = array_filter( array_map( 'absint', explode( ',', (string) haven_field( 'gallery', $post_id ) ) ) );

	$thumbnail_id = get_post_thumbnail_id( $post_id );

	if ( $thumbnail_id ) {
		$ids = array_values( array_diff( $ids, array( $thumbnail_id ) ) );
		array_unshift( $ids, $thumbnail_id );
	}

	return array_values( array_unique( $ids ) );
}

/**
 * Comma-joined term names for a property taxonomy.
 *
 * @param string   $taxonomy Taxonomy slug.
 * @param int|null $post_id  Property ID.
 * @return string
 */
function haven_term_list( $taxonomy, $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();
	$terms   = get_the_terms( $post_id, $taxonomy );

	if ( ! $terms || is_wp_error( $terms ) ) {
		return '';
	}

	return implode( ', ', wp_list_pluck( $terms, 'name' ) );
}

/**
 * The first term name for a taxonomy — used for single-value display.
 *
 * @param string   $taxonomy Taxonomy slug.
 * @param int|null $post_id  Property ID.
 * @return string
 */
function haven_first_term( $taxonomy, $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();
	$terms   = get_the_terms( $post_id, $taxonomy );

	if ( ! $terms || is_wp_error( $terms ) ) {
		return '';
	}

	$term = array_shift( $terms );

	return $term->name;
}

/**
 * A readable one-line location, preferring the Location taxonomy.
 *
 * @param int|null $post_id Property ID.
 * @return string
 */
function haven_get_location( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();
	$terms   = get_the_terms( $post_id, Haven_CPT::TAX_LOCATION );

	if ( $terms && ! is_wp_error( $terms ) ) {
		// Deepest term first reads best: "Malibu, California".
		usort(
			$terms,
			static function ( $a, $b ) {
				return $b->parent <=> $a->parent;
			}
		);
		$names = wp_list_pluck( $terms, 'name' );

		return implode( ', ', array_slice( $names, 0, 2 ) );
	}

	$city   = haven_field( 'city', $post_id );
	$region = haven_field( 'region', $post_id );

	return trim( implode( ', ', array_filter( array( $city, $region ) ) ), ', ' );
}

/**
 * Full street address for the detail page and schema.
 *
 * @param int|null $post_id Property ID.
 * @return string
 */
function haven_get_full_address( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();

	$parts = array(
		haven_field( 'address', $post_id ),
		haven_field( 'city', $post_id ),
		trim( haven_field( 'region', $post_id ) . ' ' . haven_field( 'postcode', $post_id ) ),
		haven_field( 'country', $post_id ),
	);

	return implode( ', ', array_filter( array_map( 'trim', $parts ) ) );
}

/**
 * Whether this listing is a rental.
 *
 * @param int|null $post_id Property ID.
 * @return bool
 */
function haven_is_rental( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();

	if ( haven_field( 'price_period', $post_id ) ) {
		return true;
	}

	$purpose = haven_first_term( Haven_CPT::TAX_PURPOSE, $post_id );

	return false !== stripos( $purpose, 'rent' );
}

/**
 * Availability label, e.g. "Sold".
 *
 * @param int|null $post_id Property ID.
 * @return string
 */
function haven_availability_label( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();
	$schema  = Haven_Meta::schema();
	$value   = haven_field( 'availability', $post_id );

	return isset( $schema['availability']['options'][ $value ] ) ? $schema['availability']['options'][ $value ] : $value;
}

/**
 * The listing representative, falling back to the site-wide default.
 *
 * @param int|null $post_id Property ID.
 * @return array{name:string,email:string,phone:string,photo_id:int}
 */
function haven_get_agent( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();

	return array(
		'name'     => haven_field( 'agent_name', $post_id ) ?: get_theme_mod( 'haven_agent_name', get_bloginfo( 'name' ) ),
		'email'    => haven_field( 'agent_email', $post_id ) ?: get_theme_mod( 'haven_contact_email', get_option( 'admin_email' ) ),
		'phone'    => haven_field( 'agent_phone', $post_id ) ?: get_theme_mod( 'haven_contact_phone', '' ),
		'photo_id' => (int) ( haven_field( 'agent_photo_id', $post_id ) ?: get_theme_mod( 'haven_agent_photo_id', 0 ) ),
	);
}

/**
 * Price per square foot, or an empty string when it cannot be computed.
 *
 * @param int|null $post_id Property ID.
 * @return string
 */
function haven_price_per_sqft( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();

	$price = (float) haven_field( 'price', $post_id );
	$area  = (float) haven_field( 'area_sqft', $post_id );

	if ( $price <= 0 || $area <= 0 || haven_field( 'price_on_request', $post_id ) ) {
		return '';
	}

	return haven_format_price( round( $price / $area ) );
}

/**
 * A plain-text summary used for meta descriptions and social cards.
 *
 * @param int|null $post_id Property ID.
 * @param int      $length  Maximum characters.
 * @return string
 */
function haven_get_summary( $post_id = null, $length = 158 ) {
	$post_id = $post_id ? $post_id : get_the_ID();

	$custom = haven_field( 'seo_description', $post_id );

	if ( $custom ) {
		return $custom;
	}

	$excerpt = has_excerpt( $post_id ) ? get_the_excerpt( $post_id ) : '';

	if ( ! $excerpt ) {
		$excerpt = wp_strip_all_tags( get_post_field( 'post_content', $post_id ) );
	}

	if ( ! $excerpt ) {
		// Build one from the specs so no listing ever ships without a description.
		$excerpt = sprintf(
			/* translators: 1: bedrooms, 2: bathrooms, 3: area, 4: location */
			__( '%1$s bedroom, %2$s bathroom residence of %3$s sq ft in %4$s.', 'haven' ),
			haven_field( 'bedrooms', $post_id ),
			haven_field( 'bathrooms', $post_id ),
			number_format_i18n( (float) haven_field( 'area_sqft', $post_id ) ),
			haven_get_location( $post_id )
		);
	}

	$excerpt = trim( preg_replace( '/\s+/', ' ', $excerpt ) );

	return wp_html_excerpt( $excerpt, $length, '…' );
}

/**
 * Link to the properties archive, optionally with filter arguments.
 *
 * @param array $args Query arguments to append.
 * @return string
 */
function haven_archive_url( $args = array() ) {
	$url = get_post_type_archive_link( Haven_CPT::POST_TYPE );

	if ( ! $url ) {
		$url = home_url( '/properties/' );
	}

	return $args ? add_query_arg( $args, $url ) : $url;
}

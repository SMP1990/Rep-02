<?php
/**
 * Server-side search, filtering and sorting for the property archive.
 *
 * The React build filtered an array in the browser, which meant shipping every
 * listing to every visitor and hiding the results from crawlers. Here the same
 * filters run as one indexed SQL query in `pre_get_posts`, so the archive stays
 * paginated, cacheable and crawlable.
 *
 * Filter state travels as plain query args, e.g.
 *   /properties/?purpose=for-rent&type=villa&min_price=1000000&beds=4
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

class Haven_Query {

	public static function init() {
		add_action( 'pre_get_posts', array( __CLASS__, 'apply_filters_to_query' ) );
		add_filter( 'posts_search', array( __CLASS__, 'unrestrict_search' ), 10, 2 );
	}

	/**
	 * The filter arguments this archive understands, read from the request.
	 *
	 * @return array
	 */
	public static function current_filters() {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- public, read-only filtering.
		$get = $_GET;
		// phpcs:enable

		$filters = array(
			'q'         => isset( $get['q'] ) ? sanitize_text_field( wp_unslash( $get['q'] ) ) : '',
			'purpose'   => isset( $get['purpose'] ) ? sanitize_title( wp_unslash( $get['purpose'] ) ) : '',
			'type'      => isset( $get['type'] ) ? sanitize_title( wp_unslash( $get['type'] ) ) : '',
			'location'  => isset( $get['location'] ) ? sanitize_title( wp_unslash( $get['location'] ) ) : '',
			'min_price' => isset( $get['min_price'] ) && '' !== $get['min_price'] ? absint( $get['min_price'] ) : '',
			'max_price' => isset( $get['max_price'] ) && '' !== $get['max_price'] ? absint( $get['max_price'] ) : '',
			'beds'      => isset( $get['beds'] ) && '' !== $get['beds'] ? absint( $get['beds'] ) : '',
			'baths'     => isset( $get['baths'] ) && '' !== $get['baths'] ? absint( $get['baths'] ) : '',
			'min_area'  => isset( $get['min_area'] ) && '' !== $get['min_area'] ? absint( $get['min_area'] ) : '',
			'max_area'  => isset( $get['max_area'] ) && '' !== $get['max_area'] ? absint( $get['max_area'] ) : '',
			'sort'      => isset( $get['sort'] ) ? sanitize_key( wp_unslash( $get['sort'] ) ) : 'featured',
			'amenity'   => array(),
		);

		if ( isset( $get['amenity'] ) ) {
			$raw                  = is_array( $get['amenity'] ) ? wp_unslash( $get['amenity'] ) : explode( ',', wp_unslash( $get['amenity'] ) );
			$filters['amenity']   = array_values( array_filter( array_map( 'sanitize_title', $raw ) ) );
		}

		$allowed_sorts = array( 'featured', 'newest', 'price_asc', 'price_desc', 'area_desc' );

		if ( ! in_array( $filters['sort'], $allowed_sorts, true ) ) {
			$filters['sort'] = 'featured';
		}

		return $filters;
	}

	/**
	 * True when the visitor has narrowed the archive in any way.
	 *
	 * @return bool
	 */
	public static function has_active_filters() {
		foreach ( self::current_filters() as $key => $value ) {
			if ( 'sort' === $key ) {
				continue;
			}

			if ( ! empty( $value ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * How many filters are active — used for the "Filters (3)" badge.
	 *
	 * @return int
	 */
	public static function active_filter_count() {
		$count = 0;

		foreach ( self::current_filters() as $key => $value ) {
			if ( 'sort' === $key ) {
				continue;
			}

			if ( 'amenity' === $key ) {
				$count += count( $value );
				continue;
			}

			if ( ! empty( $value ) ) {
				$count++;
			}
		}

		return $count;
	}

	/**
	 * Translate the request filters into the main WP_Query.
	 *
	 * @param WP_Query $query Query being prepared.
	 */
	public static function apply_filters_to_query( $query ) {
		if ( is_admin() || ! $query->is_main_query() ) {
			return;
		}

		$is_property_archive = $query->is_post_type_archive( Haven_CPT::POST_TYPE )
			|| $query->is_tax( array( Haven_CPT::TAX_TYPE, Haven_CPT::TAX_LOCATION, Haven_CPT::TAX_PURPOSE, Haven_CPT::TAX_AMENITY ) );

		if ( ! $is_property_archive ) {
			return;
		}

		$filters = self::current_filters();

		$query->set( 'posts_per_page', (int) apply_filters( 'haven_properties_per_page', 9 ) );

		if ( $filters['q'] ) {
			$query->set( 's', $filters['q'] );
		}

		// --- Taxonomy filters --------------------------------------------.
		$tax_query = (array) $query->get( 'tax_query' );

		$tax_map = array(
			'purpose'  => Haven_CPT::TAX_PURPOSE,
			'type'     => Haven_CPT::TAX_TYPE,
			'location' => Haven_CPT::TAX_LOCATION,
		);

		foreach ( $tax_map as $arg => $taxonomy ) {
			if ( $filters[ $arg ] ) {
				$tax_query[] = array(
					'taxonomy'         => $taxonomy,
					'field'            => 'slug',
					'terms'            => $filters[ $arg ],
					'include_children' => true,
				);
			}
		}

		if ( $filters['amenity'] ) {
			// AND: a listing must offer every amenity the visitor ticked.
			$tax_query[] = array(
				'taxonomy' => Haven_CPT::TAX_AMENITY,
				'field'    => 'slug',
				'terms'    => $filters['amenity'],
				'operator' => 'AND',
			);
		}

		if ( count( $tax_query ) > 1 ) {
			$tax_query['relation'] = 'AND';
		}

		if ( $tax_query ) {
			$query->set( 'tax_query', $tax_query );
		}

		// --- Numeric meta filters ----------------------------------------.
		$meta_query = (array) $query->get( 'meta_query' );

		$ranges = array(
			array( 'price', $filters['min_price'], '>=' ),
			array( 'price', $filters['max_price'], '<=' ),
			array( 'bedrooms', $filters['beds'], '>=' ),
			array( 'bathrooms', $filters['baths'], '>=' ),
			array( 'area_sqft', $filters['min_area'], '>=' ),
			array( 'area_sqft', $filters['max_area'], '<=' ),
		);

		foreach ( $ranges as $range ) {
			list( $key, $value, $compare ) = $range;

			if ( '' === $value || null === $value ) {
				continue;
			}

			$meta_query[] = array(
				'key'     => Haven_Meta::PREFIX . $key,
				'value'   => $value,
				'type'    => 'DECIMAL(14,2)',
				'compare' => $compare,
			);
		}

		if ( count( $meta_query ) > 1 ) {
			$meta_query['relation'] = 'AND';
		}

		if ( $meta_query ) {
			$query->set( 'meta_query', $meta_query );
		}

		// --- Sorting -----------------------------------------------------.
		self::apply_sort( $query, $filters['sort'] );
	}

	/**
	 * Apply one of the five sort orders.
	 *
	 * @param WP_Query $query Query being prepared.
	 * @param string   $sort  Sort key.
	 */
	private static function apply_sort( $query, $sort ) {
		switch ( $sort ) {
			case 'price_asc':
			case 'price_desc':
				$query->set( 'meta_key', Haven_Meta::PREFIX . 'price' );
				$query->set( 'orderby', array( 'meta_value_num' => 'price_asc' === $sort ? 'ASC' : 'DESC', 'date' => 'DESC' ) );
				break;

			case 'area_desc':
				$query->set( 'meta_key', Haven_Meta::PREFIX . 'area_sqft' );
				$query->set( 'orderby', array( 'meta_value_num' => 'DESC', 'date' => 'DESC' ) );
				break;

			case 'newest':
				$query->set( 'orderby', array( 'date' => 'DESC' ) );
				break;

			case 'featured':
			default:
				// Featured first, then newest. Handled in `featured_clauses()` with
				// a LEFT JOIN so listings that have never had the flag saved still
				// appear, instead of being dropped by an INNER JOIN on the meta.
				$query->set( 'haven_featured_first', true );
				add_filter( 'posts_clauses', array( __CLASS__, 'featured_clauses' ), 10, 2 );
				break;
		}
	}

	/**
	 * LEFT JOIN the featured flag and sort by it, treating "missing" as 0.
	 *
	 * @param array    $clauses SQL clauses.
	 * @param WP_Query $query   Current query.
	 * @return array
	 */
	public static function featured_clauses( $clauses, $query ) {
		global $wpdb;

		if ( ! $query->get( 'haven_featured_first' ) ) {
			return $clauses;
		}

		$clauses['join'] .= $wpdb->prepare(
			" LEFT JOIN {$wpdb->postmeta} AS haven_feat
				ON ( haven_feat.post_id = {$wpdb->posts}.ID AND haven_feat.meta_key = %s )",
			Haven_Meta::PREFIX . 'featured'
		);

		$clauses['orderby'] = "COALESCE(haven_feat.meta_value + 0, 0) DESC, {$wpdb->posts}.post_date DESC";

		return $clauses;
	}

	/**
	 * Let the archive keyword search look at property meta as well as content.
	 *
	 * Without this, searching for "Malibu" misses listings that only carry the
	 * city in a meta field.
	 *
	 * @param string   $search Search SQL.
	 * @param WP_Query $query  Current query.
	 * @return string
	 */
	public static function unrestrict_search( $search, $query ) {
		global $wpdb;

		if ( is_admin() || ! $query->is_main_query() || ! $query->is_search() || empty( $search ) ) {
			return $search;
		}

		if ( ! $query->is_post_type_archive( Haven_CPT::POST_TYPE ) && Haven_CPT::POST_TYPE !== $query->get( 'post_type' ) ) {
			return $search;
		}

		$term = $query->get( 's' );

		if ( ! $term ) {
			return $search;
		}

		$like = '%' . $wpdb->esc_like( $term ) . '%';

		$meta_sql = $wpdb->prepare(
			"EXISTS (
				SELECT 1 FROM {$wpdb->postmeta} hm
				WHERE hm.post_id = {$wpdb->posts}.ID
				AND hm.meta_key IN ( %s, %s, %s )
				AND hm.meta_value LIKE %s
			)",
			Haven_Meta::PREFIX . 'city',
			Haven_Meta::PREFIX . 'region',
			Haven_Meta::PREFIX . 'address',
			$like
		);

		// Core hands us " AND (…)". Re-wrap that group as ( original OR meta )
		// rather than trying to splice inside its parentheses.
		$inner = preg_replace( '/^\s*AND\s+/i', '', $search, 1 );

		return ' AND ( ' . $inner . ' OR ' . $meta_sql . ' ) ';
	}
}

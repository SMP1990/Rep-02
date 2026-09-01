<?php
/**
 * Catalogue filtering.
 *
 * The filter is a plain GET form. Every control is a real input with a real
 * name, the form submits to the catalogue URL, and the server applies the
 * whole filter set to the product query — so filtering works with JavaScript
 * switched off, every filtered view has its own shareable URL, and the back
 * button behaves. The script layer on top of that swaps the results in place
 * and rewrites the URL; it is an enhancement, never the mechanism.
 *
 * Nothing here reads a raw $_GET value directly into a query. Requests pass
 * through marketly_filter_state(), which is the only place that touches the
 * superglobal and which coerces each key to the type its schema declares.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

/**
 * Ceiling on how many products the facet counter will consider.
 *
 * Counting "how many results would this option give me" means resolving the
 * matching set, which is unbounded work on a large catalogue. Past this many
 * matches the panel drops its counts and keeps filtering; the numbers are a
 * convenience, the filtering is not.
 *
 * @return int
 */
function marketly_filter_count_limit() {
	/**
	 * Filters the catalogue size above which facet counts are skipped.
	 *
	 * @param int $limit Number of products.
	 */
	return (int) apply_filters( 'marketly_filter_count_limit', 2000 );
}

/**
 * The filter schema: every key the catalogue understands.
 *
 * Each entry declares the type the value is coerced to and the default that
 * counts as "not filtering". A key absent from here cannot reach a query, so
 * adding a filter is a matter of adding a row and a section in the panel.
 *
 * @return array
 */
function marketly_filter_schema() {
	return array(
		'q'         => array(
			'type'    => 'text',
			'default' => '',
		),
		'cat'       => array(
			'type'    => 'slug',
			'default' => '',
		),
		'brand'     => array(
			'type'    => 'slugs',
			'default' => array(),
		),
		'tag'       => array(
			'type'    => 'slugs',
			'default' => array(),
		),
		'price_min' => array(
			'type'    => 'price',
			'default' => null,
		),
		'price_max' => array(
			'type'    => 'price',
			'default' => null,
		),
		'rating'    => array(
			'type'    => 'rating',
			'default' => 0.0,
		),
		'discount'  => array(
			'type'    => 'percent',
			'default' => 0,
		),
		'instock'   => array(
			'type'    => 'bool',
			'default' => false,
		),
		'sale'      => array(
			'type'    => 'bool',
			'default' => false,
		),
		'featured'  => array(
			'type'    => 'bool',
			'default' => false,
		),
		'top'       => array(
			'type'    => 'bool',
			'default' => false,
		),
		'orderby'   => array(
			'type'    => 'orderby',
			'default' => '',
		),
	);
}

/**
 * Coerce one raw request value to the type its schema row declares.
 *
 * @param mixed  $raw  Raw value.
 * @param string $type Declared type.
 * @return mixed
 */
function marketly_filter_cast( $raw, $type ) {
	switch ( $type ) {
		case 'text':
			return sanitize_text_field( wp_unslash( (string) $raw ) );

		case 'slug':
			return sanitize_title( wp_unslash( (string) $raw ) );

		case 'slugs':
			// Accepts either repeated inputs (brand[]=a&brand[]=b) or the
			// comma-joined form the script writes into the URL.
			$parts = is_array( $raw ) ? $raw : explode( ',', (string) $raw );
			$parts = array_map( 'sanitize_title', array_map( 'wp_unslash', $parts ) );

			return array_values( array_slice( array_unique( array_filter( $parts ) ), 0, 50 ) );

		case 'price':
			$value = wp_unslash( (string) $raw );

			if ( '' === trim( $value ) || ! is_numeric( $value ) ) {
				return null;
			}

			return max( 0.0, round( (float) $value, wc_get_price_decimals() ) );

		case 'rating':
			$value = (float) wp_unslash( (string) $raw );

			return min( 5.0, max( 0.0, round( $value, 1 ) ) );

		case 'percent':
			$value = (int) wp_unslash( (string) $raw );

			return min( 100, max( 0, $value ) );

		case 'bool':
			return in_array( (string) wp_unslash( (string) $raw ), array( '1', 'true', 'yes', 'on' ), true );

		case 'orderby':
			$allowed = array_keys( marketly_filter_orderby_options() );
			$value   = sanitize_key( wp_unslash( (string) $raw ) );

			return in_array( $value, $allowed, true ) ? $value : '';
	}

	return null;
}

/**
 * The sort options the catalogue offers.
 *
 * @return array Key => label.
 */
function marketly_filter_orderby_options() {
	return array(
		'popularity' => __( 'Most popular', 'marketly' ),
		'rating'     => __( 'Best rated', 'marketly' ),
		'date'       => __( 'Newest first', 'marketly' ),
		'price'      => __( 'Price: low to high', 'marketly' ),
		'price-desc' => __( 'Price: high to low', 'marketly' ),
	);
}

/**
 * Read the current filter state from the request.
 *
 * The single point at which $_GET is read. No nonce: this is a public,
 * read-only, idempotent catalogue view — the same thing a visitor gets by
 * clicking a category link — so a nonce would only break shared and indexed
 * URLs without protecting anything. Safety comes from the schema, which
 * discards any key it does not know and coerces the rest.
 *
 * @param array|null $override Values to read instead of the request.
 * @return array
 */
function marketly_filter_state( $override = null ) {
	static $cached = null;

	if ( null === $override && null !== $cached ) {
		return $cached;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Public read-only catalogue view; see docblock.
	$source = ( null === $override ) ? $_GET : $override;
	$state  = array();

	foreach ( marketly_filter_schema() as $key => $row ) {
		$state[ $key ] = isset( $source[ $key ] )
			? marketly_filter_cast( $source[ $key ], $row['type'] )
			: $row['default'];
	}

	// A price range entered backwards is a typo, not a request for nothing.
	if ( null !== $state['price_min'] && null !== $state['price_max'] && $state['price_min'] > $state['price_max'] ) {
		$swap               = $state['price_min'];
		$state['price_min'] = $state['price_max'];
		$state['price_max'] = $swap;
	}

	if ( null === $override ) {
		$cached = $state;
	}

	return $state;
}

/**
 * Whether a state differs from the schema defaults.
 *
 * @param array  $state State.
 * @param string $skip  Optional key to ignore.
 * @return bool
 */
function marketly_filter_is_active( $state, $skip = '' ) {
	foreach ( marketly_filter_schema() as $key => $row ) {
		if ( $key === $skip || 'orderby' === $key ) {
			continue;
		}

		if ( $state[ $key ] !== $row['default'] ) {
			return true;
		}
	}

	return false;
}

/**
 * How many individual choices the visitor has made.
 *
 * Each selected brand and tag counts separately, which is what the panel's
 * badge and the "Reset" affordance are describing.
 *
 * @param array $state State.
 * @return int
 */
function marketly_filter_count_active( $state ) {
	$count = 0;

	foreach ( marketly_filter_schema() as $key => $row ) {
		if ( 'orderby' === $key ) {
			continue;
		}

		if ( is_array( $state[ $key ] ) ) {
			$count += count( $state[ $key ] );
		} elseif ( $state[ $key ] !== $row['default'] ) {
			++$count;
		}
	}

	// A price range is one decision even when both ends moved.
	if ( null !== $state['price_min'] && null !== $state['price_max'] ) {
		--$count;
	}

	return max( 0, $count );
}

/* ------------------------------------------------------------ Query building */

/**
 * The sales figure a product must reach to count as a best seller.
 *
 * Defined against the shop's own catalogue rather than a fixed number, so
 * the filter means the same thing — "among the best selling here" — whether
 * the store has sold forty items or forty thousand. Cached for a day because
 * it moves slowly and is read on every filtered request.
 *
 * @return int
 */
function marketly_filter_bestseller_floor() {
	$cached = get_transient( 'marketly_bestseller_floor' );

	if ( false !== $cached ) {
		return (int) $cached;
	}

	global $wpdb;

	/**
	 * Filters how many products make up the best-selling shelf.
	 *
	 * @param int $size Number of products.
	 */
	$size = max( 1, (int) apply_filters( 'marketly_bestseller_size', 20 ) );

	// The sales figure of the Nth best seller: everything at or above it is
	// in the top N.
	// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Cached in the transient read above and written below; ranking by a meta value has no core API.
	$floor = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT pm.meta_value + 0
			   FROM {$wpdb->postmeta} pm
			   INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
			  WHERE pm.meta_key = 'total_sales'
			    AND p.post_type = 'product'
			    AND p.post_status = 'publish'
			  ORDER BY pm.meta_value + 0 DESC
			  LIMIT 1 OFFSET %d",
			$size - 1
		)
	);

	// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

	$floor = max( 1, (int) $floor );

	set_transient( 'marketly_bestseller_floor', $floor, DAY_IN_SECONDS );

	return $floor;
}

/**
 * Forget the cached best-seller floor when an order moves the figures.
 */
function marketly_filter_flush_bestseller_floor() {
	delete_transient( 'marketly_bestseller_floor' );
}
add_action( 'woocommerce_order_status_completed', 'marketly_filter_flush_bestseller_floor' );
add_action( 'woocommerce_product_set_stock', 'marketly_filter_flush_bestseller_floor' );

/**
 * The discount percentage stored against a product, for filtering.
 *
 * Percentage off is not a column WooCommerce keeps, and deriving it inside a
 * query would mean arithmetic across two meta rows on every product. Writing
 * it once per save turns "30% off or more" into an ordinary indexed range
 * comparison.
 *
 * @param WC_Product $product Product.
 * @return int Whole percent, 0 when not reduced.
 */
function marketly_filter_discount_of( $product ) {
	if ( ! $product instanceof WC_Product ) {
		return 0;
	}

	$regular = (float) $product->get_regular_price();
	$active  = (float) $product->get_price();

	if ( $regular <= 0 || $active <= 0 || $active >= $regular ) {
		return 0;
	}

	return (int) round( ( ( $regular - $active ) / $regular ) * 100 );
}

/**
 * Keep the stored discount in step with the product.
 *
 * @param WC_Product $product Product.
 */
function marketly_filter_store_discount( $product ) {
	if ( ! $product instanceof WC_Product ) {
		return;
	}

	update_post_meta( $product->get_id(), '_marketly_discount', marketly_filter_discount_of( $product ) );
}
add_action( 'woocommerce_after_product_object_save', 'marketly_filter_store_discount' );

/**
 * Fill in the discount meta for products saved before the filter existed.
 *
 * Runs once, in batches, on a scheduled event rather than in a request, so a
 * large catalogue never turns a page load into a migration.
 */
function marketly_filter_backfill_discounts() {
	$ids = get_posts(
		array(
			'post_type'      => 'product',
			'post_status'    => 'any',
			'posts_per_page' => 200, // phpcs:ignore WordPress.WP.PostsPerPage.posts_per_page_posts_per_page -- One batch of a scheduled backfill, not a page query; it reschedules itself until the catalogue is done.
			'fields'         => 'ids',
			'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- One-off backfill on a scheduled event.
				array(
					'key'     => '_marketly_discount',
					'compare' => 'NOT EXISTS',
				),
			),
		)
	);

	if ( ! $ids ) {
		wp_clear_scheduled_hook( 'marketly_filter_backfill' );

		return;
	}

	foreach ( $ids as $id ) {
		$product = wc_get_product( $id );

		if ( $product ) {
			update_post_meta( $id, '_marketly_discount', marketly_filter_discount_of( $product ) );
		}
	}

	// More to do: come back in a minute rather than holding this request.
	if ( ! wp_next_scheduled( 'marketly_filter_backfill' ) ) {
		wp_schedule_single_event( time() + MINUTE_IN_SECONDS, 'marketly_filter_backfill' );
	}
}
add_action( 'marketly_filter_backfill', 'marketly_filter_backfill_discounts' );

/**
 * Start the backfill the first time the theme runs with WooCommerce present.
 */
function marketly_filter_schedule_backfill() {
	if ( ! marketly_has_woocommerce() || get_option( 'marketly_discounts_filled' ) ) {
		return;
	}

	update_option( 'marketly_discounts_filled', 1, false );

	if ( ! wp_next_scheduled( 'marketly_filter_backfill' ) ) {
		wp_schedule_single_event( time() + 10, 'marketly_filter_backfill' );
	}
}
add_action( 'init', 'marketly_filter_schedule_backfill', 20 );

/**
 * Translate a filter state into WP_Query arguments.
 *
 * Returns only the clauses the state actually calls for, so an unfiltered
 * catalogue runs exactly the query it ran before this file existed.
 *
 * @param array $state  Filter state.
 * @param array $ignore Keys to leave out — used when counting a facet
 *                      against everything except its own group.
 * @return array
 */
function marketly_filter_query_args( $state, $ignore = array() ) {
	$args      = array();
	$tax       = array();
	$meta      = array();
	$in_effect = static function ( $key ) use ( $ignore ) {
		return ! in_array( $key, $ignore, true );
	};

	if ( $in_effect( 'q' ) && '' !== $state['q'] ) {
		$args['s'] = $state['q'];
	}

	if ( $in_effect( 'cat' ) && '' !== $state['cat'] ) {
		$tax[] = array(
			'taxonomy' => 'product_cat',
			'field'    => 'slug',
			'terms'    => $state['cat'],
		);
	}

	if ( $in_effect( 'brand' ) && $state['brand'] && taxonomy_exists( 'product_brand' ) ) {
		$tax[] = array(
			'taxonomy' => 'product_brand',
			'field'    => 'slug',
			'terms'    => $state['brand'],
			'operator' => 'IN',
		);
	}

	if ( $in_effect( 'tag' ) && $state['tag'] ) {
		$tax[] = array(
			'taxonomy' => 'product_tag',
			'field'    => 'slug',
			'terms'    => $state['tag'],
			'operator' => 'IN',
		);
	}

	if ( $in_effect( 'featured' ) && $state['featured'] ) {
		$tax[] = array(
			'taxonomy' => 'product_visibility',
			'field'    => 'name',
			'terms'    => 'featured',
			'operator' => 'IN',
		);
	}

	if ( $in_effect( 'instock' ) && $state['instock'] ) {
		$meta[] = array(
			'key'   => '_stock_status',
			'value' => 'instock',
		);
	}

	if ( $in_effect( 'price' ) ) {
		if ( null !== $state['price_min'] && null !== $state['price_max'] ) {
			$meta[] = array(
				'key'     => '_price',
				'value'   => array( $state['price_min'], $state['price_max'] ),
				'compare' => 'BETWEEN',
				'type'    => 'DECIMAL(20,4)',
			);
		} elseif ( null !== $state['price_min'] ) {
			$meta[] = array(
				'key'     => '_price',
				'value'   => $state['price_min'],
				'compare' => '>=',
				'type'    => 'DECIMAL(20,4)',
			);
		} elseif ( null !== $state['price_max'] ) {
			$meta[] = array(
				'key'     => '_price',
				'value'   => $state['price_max'],
				'compare' => '<=',
				'type'    => 'DECIMAL(20,4)',
			);
		}
	}

	if ( $in_effect( 'rating' ) && $state['rating'] > 0 ) {
		$meta[] = array(
			'key'     => '_wc_average_rating',
			'value'   => $state['rating'],
			'compare' => '>=',
			'type'    => 'DECIMAL(3,2)',
		);
	}

	if ( $in_effect( 'discount' ) && $state['discount'] > 0 ) {
		$meta[] = array(
			'key'     => '_marketly_discount',
			'value'   => $state['discount'],
			'compare' => '>=',
			'type'    => 'NUMERIC',
		);
	}

	if ( $in_effect( 'top' ) && $state['top'] ) {
		$meta[] = array(
			'key'     => 'total_sales',
			'value'   => marketly_filter_bestseller_floor(),
			'compare' => '>=',
			'type'    => 'NUMERIC',
		);
	}

	if ( $in_effect( 'sale' ) && $state['sale'] ) {
		$on_sale = function_exists( 'wc_get_product_ids_on_sale' ) ? wc_get_product_ids_on_sale() : array();

		// An empty sale list has to mean "nothing", not "no restriction".
		$args['post__in'] = $on_sale ? $on_sale : array( 0 );
	}

	if ( $tax ) {
		$tax['relation']   = 'AND';
		$args['tax_query'] = $tax; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Catalogue filtering is what these taxonomies exist for.
	}

	if ( $meta ) {
		$meta['relation']   = 'AND';
		$args['meta_query'] = $meta; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Indexed WooCommerce lookup meta.
	}

	return $args;
}

/* ----------------------------------------------------------------- Facets */

/**
 * Product ids matching a state, ignoring the named groups.
 *
 * @param array $state  Filter state.
 * @param array $ignore Groups to leave out.
 * @return int[]
 */
function marketly_filter_matching_ids( $state, $ignore = array() ) {
	$args = array_merge(
		marketly_filter_query_args( $state, $ignore ),
		array(
			'post_type'              => 'product',
			'post_status'            => 'publish',
			'posts_per_page'         => marketly_filter_count_limit() + 1, // phpcs:ignore WordPress.WP.PostsPerPage.posts_per_page_posts_per_page -- Bounded by marketly_filter_count_limit(); counting facets means resolving the matching set, and one over the ceiling is how the overflow is detected.
			'fields'                 => 'ids',
			'no_found_rows'          => true,
			'ignore_sticky_posts'    => true,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
		)
	);

	// Respect catalogue visibility exactly as an archive would.
	if ( function_exists( 'wc_get_product_visibility_term_ids' ) ) {
		$hidden = wc_get_product_visibility_term_ids();

		if ( ! empty( $hidden['exclude-from-catalog'] ) ) {
			$args['tax_query'][] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Catalogue visibility, as WooCommerce does it.
				'taxonomy' => 'product_visibility',
				'field'    => 'term_taxonomy_id',
				'terms'    => array( $hidden['exclude-from-catalog'] ),
				'operator' => 'NOT IN',
			);
		}
	}

	$query = new WP_Query( $args );

	return array_map( 'intval', $query->posts );
}

/**
 * Count matches per term for one taxonomy across a set of products.
 *
 * One query for the whole group rather than one per option, which is the
 * difference between a panel that costs a query and a panel that costs sixty.
 *
 * @param int[]  $ids      Product ids.
 * @param string $taxonomy Taxonomy.
 * @return array Term id => count.
 */
function marketly_filter_term_counts( $ids, $taxonomy ) {
	if ( ! $ids || ! taxonomy_exists( $taxonomy ) ) {
		return array();
	}

	// Facet counts are read several times over one request — once per group,
	// each against a slightly different id set — so the result is cached
	// against the exact set that produced it.
	$key    = 'marketly_tc_' . md5( $taxonomy . '|' . implode( ',', $ids ) );
	$cached = wp_cache_get( $key, 'marketly_filters' );

	if ( is_array( $cached ) ) {
		return $cached;
	}

	global $wpdb;

	$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

	// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery -- $placeholders is a generated list of %d and every value is bound below; there is no core API that counts terms across an arbitrary id set.
	$rows = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT tt.term_id AS term_id, COUNT( DISTINCT tr.object_id ) AS total
			   FROM {$wpdb->term_relationships} tr
			   INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
			  WHERE tt.taxonomy = %s
			    AND tr.object_id IN ( {$placeholders} )
			  GROUP BY tt.term_id",
			array_merge( array( $taxonomy ), $ids )
		)
	);
	// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery

	$counts = array();

	foreach ( (array) $rows as $row ) {
		$counts[ (int) $row->term_id ] = (int) $row->total;
	}

	wp_cache_set( $key, $counts, 'marketly_filters', MINUTE_IN_SECONDS );

	return $counts;
}

/**
 * Read one numeric meta key for a set of products in a single query.
 *
 * @param int[]  $ids Product ids.
 * @param string $key Meta key.
 * @return float[] Values, one per product that has the key.
 */
function marketly_filter_meta_values( $ids, $key ) {
	if ( ! $ids ) {
		return array();
	}

	$cache_key = 'marketly_mv_' . md5( $key . '|' . implode( ',', $ids ) );
	$cached    = wp_cache_get( $cache_key, 'marketly_filters' );

	if ( is_array( $cached ) ) {
		return $cached;
	}

	global $wpdb;

	$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

	// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery -- $placeholders is a generated list of %d and every value is bound below; reading one meta key across an id set has no core equivalent that avoids hydrating every post.
	$values = $wpdb->get_col(
		$wpdb->prepare(
			"SELECT meta_value FROM {$wpdb->postmeta}
			  WHERE meta_key = %s AND post_id IN ( {$placeholders} )",
			array_merge( array( $key ), $ids )
		)
	);
	// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery

	$values = array_map( 'floatval', (array) $values );

	wp_cache_set( $cache_key, $values, 'marketly_filters', MINUTE_IN_SECONDS );

	return $values;
}

/**
 * The lowest and highest product price in the catalogue.
 *
 * The slider's track has to span the shop's real range, otherwise its
 * handles describe prices nothing is sold at.
 *
 * @return array{0:float,1:float}
 */
function marketly_filter_price_bounds() {
	$cached = get_transient( 'marketly_price_bounds' );

	if ( is_array( $cached ) && 2 === count( $cached ) ) {
		return array( (float) $cached[0], (float) $cached[1] );
	}

	global $wpdb;

	// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Cached in the transient read above and written below.
	$row = $wpdb->get_row(
		"SELECT MIN( pm.meta_value + 0 ) AS low, MAX( pm.meta_value + 0 ) AS high
		   FROM {$wpdb->postmeta} pm
		   INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
		  WHERE pm.meta_key = '_price'
		    AND pm.meta_value != ''
		    AND p.post_type = 'product'
		    AND p.post_status = 'publish'"
	);

	// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

	$low  = $row ? (float) $row->low : 0.0;
	$high = $row ? (float) $row->high : 0.0;

	// Round outwards to a round number so the slider's ends read cleanly.
	$low  = max( 0.0, floor( $low / 10 ) * 10 );
	$high = ceil( max( $high, $low + 10 ) / 10 ) * 10;

	set_transient( 'marketly_price_bounds', array( $low, $high ), HOUR_IN_SECONDS );

	return array( $low, $high );
}

/**
 * Forget the cached price range when a product's price changes.
 */
function marketly_filter_flush_price_bounds() {
	delete_transient( 'marketly_price_bounds' );
}
add_action( 'woocommerce_after_product_object_save', 'marketly_filter_flush_price_bounds' );
add_action( 'woocommerce_variation_set_stock', 'marketly_filter_flush_price_bounds' );

/**
 * Everything the panel needs to draw itself for the current state.
 *
 * Counts are "how many products would I have if I chose this", computed for
 * each group against the state with that group's own choices removed — so a
 * selected brand does not reduce the other brands to zero and strand the
 * visitor with no way out but Reset.
 *
 * @param array $state Filter state.
 * @return array
 */
function marketly_filter_facets( $state ) {
	$facets = array(
		'total'      => 0,
		'counted'    => false,
		'categories' => array(),
		'brands'     => array(),
		'tags'       => array(),
		'ratings'    => array(),
		'discounts'  => array(),
		'toggles'    => array(),
		'bounds'     => marketly_filter_price_bounds(),
	);

	if ( ! marketly_has_woocommerce() ) {
		return $facets;
	}

	$limit   = marketly_filter_count_limit();
	$matched = marketly_filter_matching_ids( $state );

	$facets['total'] = count( $matched );

	// Past the ceiling the panel shows options without numbers. Filtering is
	// unaffected; only the counts are dropped.
	if ( $facets['total'] > $limit ) {
		$facets['total'] = null;

		return $facets;
	}

	$facets['counted'] = true;

	/* Term groups, each counted with its own selection lifted. */

	$groups = array(
		'categories' => array( 'product_cat', 'cat' ),
		'brands'     => array( 'product_brand', 'brand' ),
		'tags'       => array( 'product_tag', 'tag' ),
	);

	foreach ( $groups as $slot => $group ) {
		list( $taxonomy, $key ) = $group;

		if ( ! taxonomy_exists( $taxonomy ) ) {
			continue;
		}

		$scope  = marketly_filter_matching_ids( $state, array( $key ) );
		$counts = marketly_filter_term_counts( $scope, $taxonomy );

		$terms = get_terms(
			array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => true,
			)
		);

		if ( is_wp_error( $terms ) ) {
			continue;
		}

		foreach ( $terms as $term ) {
			$facets[ $slot ][] = array(
				'slug'  => $term->slug,
				'name'  => $term->name,
				'count' => isset( $counts[ $term->term_id ] ) ? $counts[ $term->term_id ] : 0,
			);
		}

		// Busiest first: the options a visitor is most likely to want are
		// the ones they should not have to scroll for.
		usort(
			$facets[ $slot ],
			static function ( $a, $b ) {
				return $b['count'] <=> $a['count'];
			}
		);
	}

	/* Rating and discount buckets, from one meta read each. */

	$rating_scope = marketly_filter_meta_values( marketly_filter_matching_ids( $state, array( 'rating' ) ), '_wc_average_rating' );

	foreach ( marketly_filter_rating_steps() as $step ) {
		$facets['ratings'][ (string) $step ] = count(
			array_filter(
				$rating_scope,
				static function ( $value ) use ( $step ) {
					return $value >= $step;
				}
			)
		);
	}

	$discount_scope = marketly_filter_meta_values( marketly_filter_matching_ids( $state, array( 'discount' ) ), '_marketly_discount' );

	foreach ( marketly_filter_discount_steps() as $step ) {
		$facets['discounts'][ (string) $step ] = count(
			array_filter(
				$discount_scope,
				static function ( $value ) use ( $step ) {
					return $value >= $step;
				}
			)
		);
	}

	/* Toggles: how many results turning this on would leave. */

	foreach ( array( 'instock', 'sale', 'featured', 'top' ) as $toggle ) {
		$probe                        = $state;
		$probe[ $toggle ]             = true;
		$facets['toggles'][ $toggle ] = count( marketly_filter_matching_ids( $probe ) );
	}

	return $facets;
}

/**
 * Rating thresholds the panel offers.
 *
 * @return float[]
 */
function marketly_filter_rating_steps() {
	return array( 4.5, 4.0, 3.5, 3.0 );
}

/**
 * Discount thresholds the panel offers.
 *
 * @return int[]
 */
function marketly_filter_discount_steps() {
	return array( 10, 20, 30, 40, 50 );
}

/* ------------------------------------------------------------- The catalogue */

/**
 * Whether this request is a catalogue view the filter belongs on.
 *
 * @return bool
 */
function marketly_filter_is_catalogue() {
	if ( ! marketly_has_woocommerce() || is_admin() ) {
		return false;
	}

	return is_shop() || is_product_taxonomy();
}

/**
 * Apply the filter state to WooCommerce's own product query.
 *
 * Using WooCommerce's hook rather than pre_get_posts means the state lands
 * on the query WooCommerce has already prepared — visibility, stock display
 * and ordering included — instead of racing it.
 *
 * @param WP_Query $query Product query.
 */
function marketly_filter_apply_to_query( $query ) {
	if ( is_admin() || ! marketly_filter_is_catalogue() ) {
		return;
	}

	$state = marketly_filter_state();
	$args  = marketly_filter_query_args( $state );

	foreach ( $args as $key => $value ) {
		if ( 'tax_query' === $key || 'meta_query' === $key ) {
			// Merge rather than replace: the archive already carries the
			// clauses that put it on this category or brand in the first
			// place, and a product_visibility exclusion besides.
			$existing = (array) $query->get( $key, array() );

			unset( $existing['relation'], $value['relation'] );

			$merged             = array_merge( array_values( $existing ), array_values( $value ) );
			$merged['relation'] = 'AND';

			$query->set( $key, $merged );
			continue;
		}

		if ( 'post__in' === $key ) {
			$existing = array_filter( array_map( 'intval', (array) $query->get( 'post__in', array() ) ) );

			// Intersecting keeps both restrictions; an empty result has to
			// stay empty rather than falling back to the whole catalogue.
			$value = $existing ? array_values( array_intersect( $existing, $value ) ) : $value;

			$query->set( 'post__in', $value ? $value : array( 0 ) );
			continue;
		}

		$query->set( $key, $value );
	}
}
add_action( 'woocommerce_product_query', 'marketly_filter_apply_to_query' );

/**
 * Honour the filter's own sort control.
 *
 * @param string $current Current default.
 * @return string
 */
function marketly_filter_default_orderby( $current ) {
	if ( ! marketly_filter_is_catalogue() ) {
		return $current;
	}

	$state = marketly_filter_state();

	return '' !== $state['orderby'] ? $state['orderby'] : $current;
}
add_filter( 'woocommerce_default_catalog_orderby', 'marketly_filter_default_orderby' );

/**
 * The URL a filter state describes.
 *
 * Defaults are left out, so an unfiltered catalogue keeps its clean address
 * and every filtered view has exactly one canonical URL rather than a family
 * of equivalent ones.
 *
 * @param array       $state Filter state.
 * @param string|null $base  Base URL. Defaults to the catalogue.
 * @return string
 */
function marketly_filter_url( $state, $base = null ) {
	$base   = $base ? $base : marketly_filter_base_url();
	$schema = marketly_filter_schema();
	$query  = array();

	foreach ( $schema as $key => $row ) {
		$value = isset( $state[ $key ] ) ? $state[ $key ] : $row['default'];

		if ( $value === $row['default'] || null === $value ) {
			continue;
		}

		if ( is_array( $value ) ) {
			if ( ! $value ) {
				continue;
			}

			$query[ $key ] = implode( ',', $value );
			continue;
		}

		if ( is_bool( $value ) ) {
			$query[ $key ] = '1';
			continue;
		}

		$query[ $key ] = (string) $value;
	}

	return $query ? add_query_arg( $query, $base ) : $base;
}

/**
 * The address the filter form submits to.
 *
 * On a category or brand archive that is the archive itself, so filtering
 * within a category stays within it.
 *
 * @return string
 */
function marketly_filter_base_url() {
	if ( marketly_has_woocommerce() && is_product_taxonomy() ) {
		$term = get_queried_object();

		if ( $term instanceof WP_Term ) {
			$link = get_term_link( $term );

			if ( ! is_wp_error( $link ) ) {
				return $link;
			}
		}
	}

	return marketly_shop_url();
}

/**
 * A copy of a state with one key returned to its default.
 *
 * @param array  $state State.
 * @param string $key   Key to clear.
 * @param string $value For multi-value keys, the single entry to drop.
 * @return array
 */
function marketly_filter_without( $state, $key, $value = '' ) {
	$schema = marketly_filter_schema();

	if ( ! isset( $schema[ $key ] ) ) {
		return $state;
	}

	if ( '' !== $value && is_array( $state[ $key ] ) ) {
		$state[ $key ] = array_values( array_diff( $state[ $key ], array( $value ) ) );

		return $state;
	}

	$state[ $key ] = $schema[ $key ]['default'];

	// The two ends of the price range are one control and clear together.
	if ( 'price_min' === $key || 'price_max' === $key ) {
		$state['price_min'] = null;
		$state['price_max'] = null;
	}

	return $state;
}

/* -------------------------------------------------------------- The endpoint */

/**
 * Register the route the script refreshes results through.
 *
 * Public and read-only, like the catalogue page it mirrors: it returns the
 * same markup an unauthenticated visitor gets by loading that URL, and it
 * writes nothing. Its arguments are validated by the same schema the page
 * uses, so the endpoint cannot be coaxed into a query the page could not
 * already run.
 */
function marketly_filter_register_route() {
	register_rest_route(
		'marketly/v1',
		'/catalogue',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'marketly_filter_response',
			'permission_callback' => '__return_true',
			'args'                => array(
				'paged' => array(
					'type'              => 'integer',
					'default'           => 1,
					'sanitize_callback' => 'absint',
				),
				'base'  => array(
					'type'              => 'string',
					'default'           => '',
					'sanitize_callback' => 'esc_url_raw',
				),
				'view'  => array(
					'type'    => 'string',
					'default' => 'catalogue',
					'enum'    => array( 'catalogue', 'shelf' ),
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'marketly_filter_register_route' );

/**
 * Render a filtered page of results.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function marketly_filter_response( $request ) {
	if ( ! marketly_has_woocommerce() ) {
		return rest_ensure_response(
			array(
				'html'  => '',
				'total' => 0,
			)
		);
	}

	$state = marketly_filter_state( $request->get_params() );
	$paged = max( 1, (int) $request->get_param( 'paged' ) );

	// The base only ever chooses which archive to filter within, and a
	// caller could name any URL, so it is resolved against this site's own
	// catalogue rather than trusted. Anything else falls back to the shop.
	$base = (string) $request->get_param( 'base' );
	$base = marketly_filter_safe_base( $base );

	// The storefront shelf is a fixed row of cards, not a paginated archive:
	// it takes no sort control and no pagination, so asking for the whole
	// catalogue region there would inject both into the front page.
	$shelf = ( 'shelf' === $request->get_param( 'view' ) );

	$args = array_merge(
		marketly_filter_query_args( $state ),
		array(
			'post_type'      => 'product',
			'post_status'    => 'publish',
			'paged'          => $shelf ? 1 : $paged,
			'posts_per_page' => $shelf
				? (int) apply_filters( 'marketly_shelf_size', 8 )
				// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own filter: the endpoint must page exactly as the archive does.
				: (int) apply_filters( 'loop_shop_per_page', 12 ),
		)
	);

	$ordering = WC()->query->get_catalog_ordering_args(
		'' !== $state['orderby'] ? $state['orderby'] : get_option( 'woocommerce_default_catalog_orderby', 'menu_order' )
	);

	$args = array_merge(
		$args,
		array_filter(
			$ordering,
			static function ( $value ) {
				return null !== $value && '' !== $value;
			}
		)
	);

	// Hide anything the catalogue hides, exactly as an archive would.
	if ( function_exists( 'wc_get_product_visibility_term_ids' ) ) {
		$hidden = wc_get_product_visibility_term_ids();

		if ( ! empty( $hidden['exclude-from-catalog'] ) ) {
			$args['tax_query'][] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Catalogue visibility, as WooCommerce does it.
				'taxonomy' => 'product_visibility',
				'field'    => 'term_taxonomy_id',
				'terms'    => array( $hidden['exclude-from-catalog'] ),
				'operator' => 'NOT IN',
			);
		}
	}

	$query = new WP_Query( $args );

	if ( $shelf ) {
		$html  = marketly_filter_render_shelf( $query, $state, $base );
		$panel = '';
	} else {
		$html = marketly_filter_render_results( $query, $state, $base );

		// The panel is re-rendered with it: every count in it describes the
		// state that has just been applied, so returning stale numbers would
		// be worse than returning none.
		ob_start();
		get_template_part(
			'template-parts/filter-panel',
			null,
			array(
				'state' => $state,
				'mode'  => 'sync',
				'base'  => $base,
			)
		);
		$panel = (string) ob_get_clean();
	}

	wp_reset_postdata();

	return rest_ensure_response(
		array(
			'html'  => $html,
			'panel' => $panel,
			'total' => (int) $query->found_posts,
			'pages' => $shelf ? 1 : (int) $query->max_num_pages,
			'url'   => marketly_filter_url( $state, $base ),
		)
	);
}

/**
 * Resolve a caller-supplied base URL to one of this site's catalogue pages.
 *
 * @param string $base Candidate URL.
 * @return string
 */
function marketly_filter_safe_base( $base ) {
	$shop = marketly_shop_url();

	if ( '' === $base ) {
		return $shop;
	}

	$home = wp_parse_url( home_url(), PHP_URL_HOST );
	$host = wp_parse_url( $base, PHP_URL_HOST );

	if ( $host && $host !== $home ) {
		return $shop;
	}

	// Keep the path, drop anything else a caller attached to it.
	$path = (string) wp_parse_url( $base, PHP_URL_PATH );

	return $path ? home_url( $path ) : $shop;
}

/**
 * Render the storefront shelf: a plain grid of cards, nothing around it.
 *
 * @param WP_Query $query Product query.
 * @param array    $state Filter state.
 * @param string   $base  Base URL.
 * @return string
 */
function marketly_filter_render_shelf( $query, $state, $base ) {
	$products = array();

	foreach ( $query->posts as $post ) {
		$product = wc_get_product( $post );

		if ( $product ) {
			$products[] = $product;
		}
	}

	ob_start();

	if ( ! $products ) {
		get_template_part(
			'template-parts/filter-empty',
			null,
			array(
				'state' => $state,
				'base'  => $base,
			)
		);

		return (string) ob_get_clean();
	}

	$products = marketly_prime_products( $products );

	echo '<div class="pcols">';

	foreach ( $products as $index => $product ) {
		get_template_part(
			'template-parts/card-product',
			null,
			array(
				'product' => $product,
				'layout'  => 'v',
				'heading' => 'h3',
				'eager'   => $index < 4,
			)
		);
	}

	echo '</div>';

	return (string) ob_get_clean();
}

/**
 * Render the results region: toolbar, grid and pagination.
 *
 * The same markup the archive paints on a full page load, produced by the
 * same WooCommerce hooks, so a refreshed region is indistinguishable from a
 * freshly loaded one and any plugin hooked into the loop still runs.
 *
 * @param WP_Query $query Product query.
 * @param array    $state Filter state.
 * @param string   $base  Base URL.
 * @return string
 */
function marketly_filter_render_results( $query, $state, $base ) {
	global $wp_query;

	$previous = $wp_query;
	$wp_query = $query; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restored below; result count and pagination read the global.

	// This region is being rendered on its own, so the wrappers that put it
	// on the page must not fire again around it.
	remove_action( 'woocommerce_before_shop_loop', 'marketly_filter_results_open', 5 );
	remove_action( 'woocommerce_after_shop_loop', 'marketly_filter_results_close', 100 );

	ob_start();

	if ( $query->have_posts() ) {
		do_action( 'woocommerce_before_shop_loop' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own loop hooks, replayed deliberately so plugins hooked into the archive still run here.

		woocommerce_product_loop_start();

		while ( $query->have_posts() ) {
			$query->the_post();

			do_action( 'woocommerce_shop_loop' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own loop hooks, replayed deliberately so plugins hooked into the archive still run here.

			wc_get_template_part( 'content', 'product' );
		}

		woocommerce_product_loop_end();

		do_action( 'woocommerce_after_shop_loop' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own loop hooks, replayed deliberately so plugins hooked into the archive still run here.
	} else {
		get_template_part(
			'template-parts/filter-empty',
			null,
			array(
				'state' => $state,
				'base'  => $base,
			)
		);
	}

	$html = (string) ob_get_clean();

	add_action( 'woocommerce_before_shop_loop', 'marketly_filter_results_open', 5 );
	add_action( 'woocommerce_after_shop_loop', 'marketly_filter_results_close', 100 );

	$wp_query = $previous; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restoring the global saved above.

	wp_reset_postdata();

	return $html;
}

/* --------------------------------------------------------------- Page wiring */

/**
 * Open the region the script replaces.
 *
 * Wrapping through WooCommerce's own before/after hooks rather than by
 * overriding archive-product.php: the result count, the sort control, the
 * loop and the pagination all end up inside without the theme owning a copy
 * of WooCommerce's template.
 */
function marketly_filter_results_open() {
	printf(
		'<div class="cfilter__results" id="marketly-results" data-marketly-results aria-busy="false" aria-live="polite" data-base="%s">',
		esc_url( marketly_filter_base_url() )
	);
}

/**
 * Close the region the script replaces.
 */
function marketly_filter_results_close() {
	echo '</div>';
}

/**
 * Put the panel, the results wrapper and the mobile trigger on the archive.
 */
function marketly_filter_attach() {
	if ( ! marketly_has_woocommerce() ) {
		return;
	}

	add_action( 'woocommerce_before_shop_loop', 'marketly_filter_results_open', 5 );
	add_action( 'woocommerce_after_shop_loop', 'marketly_filter_results_close', 100 );

	// The layout wrapper has to open before the archive's header and close
	// after the loop, so the sidebar and the results sit side by side.
	add_action( 'woocommerce_before_main_content', 'marketly_filter_layout_open', 20 );
	add_action( 'woocommerce_after_main_content', 'marketly_filter_layout_close', 5 );
}
add_action( 'wp', 'marketly_filter_attach' );

/**
 * Open the two-column catalogue layout and render the panel.
 */
function marketly_filter_layout_open() {
	if ( ! marketly_filter_is_catalogue() ) {
		return;
	}

	$state = marketly_filter_state();

	echo '<div class="cfilter">';

	get_template_part(
		'template-parts/filter-panel',
		null,
		array(
			'state' => $state,
			'mode'  => 'page',
			'base'  => marketly_filter_base_url(),
		)
	);

	echo '<div class="cfilter__main">';

	get_template_part( 'template-parts/filter-trigger', null, array( 'state' => $state ) );
}

/**
 * Close the catalogue layout.
 */
function marketly_filter_layout_close() {
	if ( ! marketly_filter_is_catalogue() ) {
		return;
	}

	echo '</div></div>';
}

/**
 * Hand the script the endpoint and the strings it needs.
 *
 * Only on pages that carry a filter, so a blog post is not asked to download
 * a catalogue's worth of behaviour.
 */
function marketly_filter_enqueue() {
	if ( ! marketly_filter_is_catalogue() && ! marketly_filter_on_front() ) {
		return;
	}

	$js  = MARKETLY_DIR . '/assets/js/filters.js';
	$css = MARKETLY_DIR . '/assets/css/filters.css';

	wp_enqueue_style(
		'marketly-filters',
		MARKETLY_URI . '/assets/css/filters.css',
		array( 'marketly' ),
		file_exists( $css ) ? (string) filemtime( $css ) : MARKETLY_VERSION
	);

	wp_enqueue_script(
		'marketly-filters',
		MARKETLY_URI . '/assets/js/filters.js',
		array( 'marketly' ),
		file_exists( $js ) ? (string) filemtime( $js ) : MARKETLY_VERSION,
		true
	);

	wp_script_add_data( 'marketly-filters', 'defer', true );

	wp_localize_script(
		'marketly-filters',
		'marketlyFilters',
		array(
			'endpoint' => esc_url_raw( rest_url( 'marketly/v1/catalogue' ) ),
			'i18n'     => array(
				'loading'    => __( 'Updating results…', 'marketly' ),
				'done'       => __( 'Results updated', 'marketly' ),
				/* translators: %s: number of products. */
				'results'    => __( '%s products', 'marketly' ),
				'one'        => __( '1 product', 'marketly' ),
				'none'       => __( 'No products match', 'marketly' ),
				'error'      => __( 'We couldn’t update the results. Please try again.', 'marketly' ),
				'openPanel'  => __( 'Open filters', 'marketly' ),
				'closePanel' => __( 'Close filters', 'marketly' ),
			),
		)
	);
}
add_action( 'wp_enqueue_scripts', 'marketly_filter_enqueue', 25 );

/**
 * Whether the homepage is showing its filtered shelf.
 *
 * @return bool
 */
function marketly_filter_on_front() {
	return marketly_has_woocommerce()
		&& is_front_page()
		&& (bool) marketly_option( 'shopby_enable', true );
}

/* ------------------------------------------------------------ Panel helpers */

/**
 * Open one collapsible section of the panel.
 *
 * A real <button> with aria-expanded and aria-controls rather than a click
 * handler on a heading, so the disclosure is operable by keyboard and
 * announced as one.
 *
 * @param string $id      Section id, used for aria-controls.
 * @param string $icon    Icon name.
 * @param string $title   Heading text.
 * @param string $summary Short right-aligned summary of the current choice.
 * @param bool   $open    Whether the section starts open.
 */
function marketly_filter_section_open( $id, $icon, $title, $summary = '', $open = true ) {
	?>
	<div class="cfsec" data-cfsec>
		<h3 class="cfsec__head">
			<button type="button"
				class="cfsec__toggle"
				aria-expanded="<?php echo $open ? 'true' : 'false'; ?>"
				aria-controls="cfsec-<?php echo esc_attr( $id ); ?>">
				<span class="cfsec__title">
					<?php
					marketly_icon(
						$icon,
						array(
							'size'  => 15,
							'class' => 'cfsec__icon',
						)
					);
					?>
					<span><?php echo esc_html( $title ); ?></span>
				</span>
				<span class="cfsec__meta">
					<?php if ( '' !== $summary ) : ?>
						<span class="cfsec__summary"><?php echo esc_html( $summary ); ?></span>
					<?php endif; ?>
					<?php
					marketly_icon(
						'chevron-down',
						array(
							'size'  => 15,
							'class' => 'cfsec__chev',
						)
					);
					?>
				</span>
			</button>
		</h3>
		<div class="cfsec__body" id="cfsec-<?php echo esc_attr( $id ); ?>"<?php echo $open ? '' : ' hidden'; ?>>
	<?php
}

/**
 * Close a collapsible section.
 */
function marketly_filter_section_close() {
	echo '</div></div>';
}

/**
 * A term's display name from its slug.
 *
 * @param string $slug     Term slug.
 * @param string $taxonomy Taxonomy.
 * @return string
 */
function marketly_filter_term_name( $slug, $taxonomy ) {
	if ( '' === $slug || ! taxonomy_exists( $taxonomy ) ) {
		return '';
	}

	$term = get_term_by( 'slug', $slug, $taxonomy );

	return ( $term instanceof WP_Term ) ? $term->name : $slug;
}

/**
 * The removable chips describing every choice currently applied.
 *
 * Each chip's href is the same state with that one choice lifted, so the
 * chips are working links before any script runs.
 *
 * @param array  $state Filter state.
 * @param string $base  Base URL.
 * @return array List of label + url.
 */
function marketly_filter_chips( $state, $base ) {
	$chips = array();

	$add = static function ( $label, $without ) use ( &$chips, $base ) {
		$chips[] = array(
			'label' => $label,
			'url'   => marketly_filter_url( $without, $base ),
		);
	};

	if ( '' !== $state['cat'] ) {
		$add( marketly_filter_term_name( $state['cat'], 'product_cat' ), marketly_filter_without( $state, 'cat' ) );
	}

	foreach ( $state['brand'] as $slug ) {
		$add( marketly_filter_term_name( $slug, 'product_brand' ), marketly_filter_without( $state, 'brand', $slug ) );
	}

	foreach ( $state['tag'] as $slug ) {
		$add( '#' . marketly_filter_term_name( $slug, 'product_tag' ), marketly_filter_without( $state, 'tag', $slug ) );
	}

	if ( null !== $state['price_min'] || null !== $state['price_max'] ) {
		$bounds = marketly_filter_price_bounds();
		$low    = ( null === $state['price_min'] ) ? $bounds[0] : $state['price_min'];
		$high   = ( null === $state['price_max'] ) ? $bounds[1] : $state['price_max'];

		$add(
			wp_strip_all_tags( wc_price( $low ) ) . ' – ' . wp_strip_all_tags( wc_price( $high ) ),
			marketly_filter_without( $state, 'price_min' )
		);
	}

	if ( $state['rating'] > 0 ) {
		$add(
			sprintf(
				/* translators: %s: star rating. */
				__( '%s stars & up', 'marketly' ),
				number_format_i18n( $state['rating'], 1 )
			),
			marketly_filter_without( $state, 'rating' )
		);
	}

	if ( $state['discount'] > 0 ) {
		$add(
			sprintf(
				/* translators: %s: percentage. */
				__( '%s%% off or more', 'marketly' ),
				number_format_i18n( $state['discount'] )
			),
			marketly_filter_without( $state, 'discount' )
		);
	}

	$labels = array(
		'instock'  => __( 'In stock', 'marketly' ),
		'sale'     => __( 'On sale', 'marketly' ),
		'featured' => __( 'Featured', 'marketly' ),
		'top'      => __( 'Bestsellers', 'marketly' ),
	);

	foreach ( $labels as $key => $label ) {
		if ( $state[ $key ] ) {
			$add( $label, marketly_filter_without( $state, $key ) );
		}
	}

	if ( '' !== $state['q'] ) {
		$add(
			sprintf(
				/* translators: %s: search term. */
				__( 'Search: %s', 'marketly' ),
				$state['q']
			),
			marketly_filter_without( $state, 'q' )
		);
	}

	return $chips;
}

<?php
/**
 * The storefront data layer.
 *
 * Every homepage section reads through one of these functions, so no template
 * carries a hard-coded product, price, category or count. Each returns an
 * empty array when WooCommerce is absent, which is what lets the sections
 * render nothing rather than fatal on a store that is not set up yet.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

/**
 * Top-level product categories.
 *
 * @param array $args limit (int), hide_empty (bool).
 * @return WP_Term[]
 */
function marketly_get_product_categories( $args = array() ) {
	if ( ! marketly_has_woocommerce() ) {
		return array();
	}

	$args = wp_parse_args(
		$args,
		array(
			'limit'      => 6,
			'hide_empty' => true,
		)
	);

	$terms = get_terms(
		array(
			'taxonomy'   => 'product_cat',
			'parent'     => 0,
			'hide_empty' => (bool) $args['hide_empty'],
			'number'     => max( 0, (int) $args['limit'] ),
			'orderby'    => 'menu_order',
			'order'      => 'ASC',
		)
	);

	if ( is_wp_error( $terms ) || ! $terms ) {
		return array();
	}

	// WooCommerce files everything without a category under "Uncategorized",
	// which is noise in a category strip rather than a real department.
	$default = (int) get_option( 'default_product_cat' );

	return array_values(
		array_filter(
			$terms,
			static function ( $term ) use ( $default ) {
				return (int) $term->term_id !== $default;
			}
		)
	);
}

/**
 * A category's thumbnail attachment ID.
 *
 * @param WP_Term $term Product category.
 * @return int
 */
function marketly_category_image_id( $term ) {
	return (int) get_term_meta( $term->term_id, 'thumbnail_id', true );
}

/**
 * Featured products, as flagged by the star in the products list.
 *
 * @param int $limit How many to return.
 * @return WC_Product[]
 */
function marketly_get_featured_products( $limit = 4 ) {
	if ( ! marketly_has_woocommerce() || ! function_exists( 'wc_get_products' ) ) {
		return array();
	}

	$products = wc_get_products(
		array(
			'status'     => 'publish',
			'limit'      => max( 1, (int) $limit ),
			'featured'   => true,
			'visibility' => 'catalog',
			'orderby'    => 'date',
			'order'      => 'DESC',
		)
	);

	// A store that has not starred anything yet should still show a shelf
	// rather than a gap, so fall back to the newest products.
	if ( ! $products ) {
		$products = wc_get_products(
			array(
				'status'     => 'publish',
				'limit'      => max( 1, (int) $limit ),
				'visibility' => 'catalog',
				'orderby'    => 'date',
				'order'      => 'DESC',
			)
		);
	}

	return is_array( $products ) ? $products : array();
}

/**
 * Best sellers, ordered by WooCommerce's own total_sales counter.
 *
 * @param int $limit How many to return.
 * @return WC_Product[]
 */
function marketly_get_best_sellers( $limit = 8 ) {
	if ( ! marketly_has_woocommerce() || ! function_exists( 'wc_get_products' ) ) {
		return array();
	}

	$products = wc_get_products(
		array(
			'status'     => 'publish',
			'limit'      => max( 1, (int) $limit ),
			'visibility' => 'catalog',
			'orderby'    => 'meta_value_num',
			'meta_key'   => 'total_sales', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- WooCommerce indexes this and it is the canonical sales counter.
			'order'      => 'DESC',
		)
	);

	if ( ! $products ) {
		$products = wc_get_products(
			array(
				'status'     => 'publish',
				'limit'      => max( 1, (int) $limit ),
				'visibility' => 'catalog',
				'orderby'    => 'date',
				'order'      => 'DESC',
			)
		);
	}

	return is_array( $products ) ? $products : array();
}

/**
 * On-sale products, for the Deals page and as a deal fallback.
 *
 * @param int $limit How many to return.
 * @return WC_Product[]
 */
function marketly_get_sale_products( $limit = 12 ) {
	if ( ! marketly_has_woocommerce() || ! function_exists( 'wc_get_product_ids_on_sale' ) ) {
		return array();
	}

	$ids = wc_get_product_ids_on_sale();

	if ( ! $ids ) {
		return array();
	}

	$products = wc_get_products(
		array(
			'status'     => 'publish',
			'include'    => array_slice( $ids, 0, max( 1, (int) $limit ) ),
			'limit'      => max( 1, (int) $limit ),
			'visibility' => 'catalog',
			'orderby'    => 'date',
			'order'      => 'DESC',
		)
	);

	return is_array( $products ) ? $products : array();
}

/**
 * The product shown in the flash deal band.
 *
 * @return WC_Product|null
 */
function marketly_get_deal_product() {
	if ( ! marketly_has_woocommerce() || ! function_exists( 'wc_get_product' ) ) {
		return null;
	}

	$id = (int) marketly_option( 'deal_product' );

	if ( ! $id ) {
		return null;
	}

	$product = wc_get_product( $id );

	if ( ! $product || 'publish' !== $product->get_status() ) {
		return null;
	}

	return $product;
}

/**
 * The flash deal deadline, as a UTC timestamp.
 *
 * @return int Timestamp, or 0 when unset.
 */
function marketly_deal_deadline() {
	$value = (string) marketly_option( 'deal_ends' );

	if ( '' === $value ) {
		return 0;
	}

	// Stored as wall-clock time in the site's timezone; converted here so the
	// countdown counts down to the moment the owner actually meant.
	$time = strtotime( $value . ' ' . wp_timezone_string() );

	return $time ? (int) $time : 0;
}

/**
 * Whether the flash deal is configured and still running.
 *
 * @return bool
 */
function marketly_deal_is_live() {
	$deadline = marketly_deal_deadline();

	return marketly_get_deal_product() && $deadline > time();
}

/**
 * Published testimonials.
 *
 * @param int $limit How many to return.
 * @return WP_Post[]
 */
function marketly_get_testimonials( $limit = 6 ) {
	if ( ! marketly_core_active() ) {
		return array();
	}

	$posts = get_posts(
		array(
			'post_type'        => 'marketly_testimonial',
			'post_status'      => 'publish',
			'posts_per_page'   => max( 1, (int) $limit ),
			'orderby'          => 'menu_order date',
			'order'            => 'ASC',
			'no_found_rows'    => true,
			'suppress_filters' => false,
		)
	);

	return is_array( $posts ) ? $posts : array();
}

/**
 * The discount percentage for a product, or 0 when it is not on sale.
 *
 * Variable products are compared on their price range, so a parent shows the
 * largest saving available among its variations — which is the number a
 * shopper is being offered.
 *
 * @param WC_Product $product Product.
 * @return int Percentage, 1-99.
 */
function marketly_discount_percent( $product ) {
	if ( ! $product instanceof WC_Product || ! $product->is_on_sale() ) {
		return 0;
	}

	$regular = (float) $product->get_regular_price();
	$sale    = (float) $product->get_sale_price();

	if ( $product->is_type( 'variable' ) ) {
		$regular = (float) $product->get_variation_regular_price( 'max' );
		$sale    = (float) $product->get_variation_sale_price( 'min' );
	}

	if ( $regular <= 0 || $sale <= 0 || $sale >= $regular ) {
		return 0;
	}

	return (int) round( ( ( $regular - $sale ) / $regular ) * 100 );
}

/**
 * Render WooCommerce's loop add-to-cart button as the reference's icon square.
 *
 * Filtering the markup rather than hand-writing an anchor keeps every class
 * and data attribute WooCommerce's own AJAX relies on, along with its
 * handling of stock status, variable products and external products.
 *
 * @param string     $html    Button markup.
 * @param WC_Product $product Product.
 * @return string
 */
function marketly_loop_add_to_cart_icon( $html, $product ) {
	if ( ! $product instanceof WC_Product || '' === $html ) {
		return $html;
	}

	// Products that need a choice made (variable, external, out of stock)
	// keep their worded label — an icon would hide that a page follows.
	if ( ! $product->is_purchasable() || ! $product->is_in_stock() || ! $product->is_type( 'simple' ) ) {
		return $html;
	}

	$label = wp_strip_all_tags( $product->add_to_cart_text() );

	$replacement = marketly_get_icon( 'cart', array( 'size' => 18 ) )
		. '<span class="screen-reader-text">' . esc_html( $label ) . '</span>';

	// Replace only the anchor's text node, leaving its attributes intact.
	return (string) preg_replace(
		'#(<a\b[^>]*>)(.*?)(</a>)#is',
		'$1' . str_replace( '$', '\$', $replacement ) . '$3',
		$html,
		1
	);
}
add_filter( 'woocommerce_loop_add_to_cart_link', 'marketly_loop_add_to_cart_icon', 10, 2 );

/* ------------------------------------------------------ Homepage assembly */

/**
 * A hidden page heading, used only when the hero (which carries the visible
 * h1) is switched off — every page needs exactly one first-level heading.
 */
function marketly_home_fallback_heading() {
	if ( marketly_option( 'hero_enable' ) ) {
		return;
	}

	printf(
		'<h1 class="screen-reader-text">%s</h1>',
		esc_html( get_bloginfo( 'name' ) )
	);
}
add_action( 'marketly_homepage', 'marketly_home_fallback_heading', 5 );

/**
 * The homepage sections, in the order the design lays them out.
 *
 * @param string $slug Template part slug within template-parts/.
 * @return callable
 */
function marketly_home_section( $slug ) {
	return static function () use ( $slug ) {
		get_template_part( 'template-parts/section', $slug );
	};
}

foreach ( array(
	10 => 'categories',
	20 => 'hero',
	30 => 'flash-deal',
	40 => 'popular',
	50 => 'featured',
	60 => 'promos',
	70 => 'bestsellers',
	80 => 'testimonials',
	95 => 'newsletter',
) as $marketly_priority => $marketly_slug ) {
	add_action( 'marketly_homepage', marketly_home_section( $marketly_slug ), $marketly_priority );
}

/**
 * Whatever the owner wrote in the Home page editor.
 *
 * Renders between the shelves and the newsletter, and only when there is
 * something to render, so the page never gains an empty block.
 */
function marketly_home_page_content() {
	$id = (int) get_option( 'page_on_front' );

	if ( ! $id ) {
		return;
	}

	$post = get_post( $id );

	if ( ! $post || '' === trim( (string) $post->post_content ) ) {
		return;
	}

	echo '<section class="section"><div class="container entry__content">';
	echo apply_filters( 'the_content', $post->post_content ); // phpcs:ignore WordPress.Security.EscapingOutput.OutputNotEscaped -- Passed through the_content, which escapes.
	echo '</div></section>';
}
add_action( 'marketly_homepage', 'marketly_home_page_content', 90 );

<?php
/**
 * WooCommerce integration.
 *
 * Almost all of it is hooks. The theme ships exactly one WooCommerce template
 * override — woocommerce/content-product.php — and that file only defers to
 * the card partial the homepage already uses, so a product looks the same in
 * every shelf, archive and related-products row.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

/**
 * Declare support and the image sizes WooCommerce should generate.
 */
function marketly_woocommerce_support() {
	add_theme_support(
		'woocommerce',
		array(
			'thumbnail_image_width' => 600,
			'single_image_width'    => 1000,
			'product_grid'          => array(
				'default_columns' => 4,
				'min_columns'     => 2,
				'max_columns'     => 5,
			),
		)
	);

	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );
}
add_action( 'after_setup_theme', 'marketly_woocommerce_support' );

/* ------------------------------------------------------------ The loop */

/**
 * Unhook WooCommerce's default loop item pieces.
 *
 * The card partial renders the image, badge, title, rating, price and button
 * itself. The surrounding woocommerce_before/after_shop_loop_item actions are
 * deliberately left in place and fired by the override, so a plugin that
 * appends something to a product card still works.
 */
function marketly_unhook_loop_defaults() {
	remove_action( 'woocommerce_before_shop_loop_item', 'woocommerce_template_loop_product_link_open', 10 );
	remove_action( 'woocommerce_before_shop_loop_item_title', 'woocommerce_show_product_loop_sale_flash', 10 );
	remove_action( 'woocommerce_before_shop_loop_item_title', 'woocommerce_template_loop_product_thumbnail', 10 );
	remove_action( 'woocommerce_shop_loop_item_title', 'woocommerce_template_loop_product_title', 10 );
	remove_action( 'woocommerce_after_shop_loop_item_title', 'woocommerce_template_loop_rating', 5 );
	remove_action( 'woocommerce_after_shop_loop_item_title', 'woocommerce_template_loop_price', 10 );
	remove_action( 'woocommerce_after_shop_loop_item', 'woocommerce_template_loop_product_link_close', 5 );
	remove_action( 'woocommerce_after_shop_loop_item', 'woocommerce_template_loop_add_to_cart', 10 );
}
add_action( 'init', 'marketly_unhook_loop_defaults' );

/**
 * Append the theme's button classes to WooCommerce's loop add-to-cart button.
 *
 * Appending rather than passing a class argument to the template function:
 * that argument replaces the whole class list, taking add_to_cart_button and
 * ajax_add_to_cart with it, which silently turns every card button back into
 * a plain link.
 *
 * @param array      $args    Button arguments.
 * @param WC_Product $product Product.
 * @return array
 */
function marketly_loop_add_to_cart_args( $args, $product ) {
	$existing = isset( $args['class'] ) ? (string) $args['class'] : '';

	$args['class'] = trim( $existing . ' btn btn--outline btn--icon btn--sm pcard__cart' );

	return $args;
}
add_filter( 'woocommerce_loop_add_to_cart_args', 'marketly_loop_add_to_cart_args', 10, 2 );

/**
 * Products per row on archives.
 *
 * @return int
 */
function marketly_loop_columns() {
	return 4;
}
add_filter( 'loop_shop_columns', 'marketly_loop_columns', 20 );

/**
 * Products per archive page.
 *
 * @return int
 */
function marketly_loop_per_page() {
	return 12;
}
add_filter( 'loop_shop_per_page', 'marketly_loop_per_page', 20 );

/* --------------------------------------------------------- Page wrappers */

/**
 * Open the shop wrapper.
 *
 * Replaces WooCommerce's own wrapper markup with the theme's container, so
 * archives sit on the same grid as every other page. Done with the hook
 * rather than by overriding woocommerce.php or archive-product.php.
 */
function marketly_wrapper_start() {
	echo '<div class="container woo">';
}

/**
 * Close the shop wrapper.
 */
function marketly_wrapper_end() {
	echo '</div>';
}

/**
 * Swap WooCommerce's wrappers for the theme's.
 */
function marketly_replace_wrappers() {
	remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10 );
	remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10 );
	add_action( 'woocommerce_before_main_content', 'marketly_wrapper_start', 10 );
	add_action( 'woocommerce_after_main_content', 'marketly_wrapper_end', 10 );

	// The catalogue has no sidebar in this design; the Shop Sidebar widget
	// area is rendered by the archive template only when it holds widgets.
	remove_action( 'woocommerce_sidebar', 'woocommerce_get_sidebar', 10 );
}
add_action( 'init', 'marketly_replace_wrappers' );

/**
 * Move the breadcrumb above the page title and give it the theme's markup.
 *
 * @param array $args Breadcrumb arguments.
 * @return array
 */
function marketly_breadcrumb_args( $args ) {
	return array_merge(
		$args,
		array(
			'delimiter'   => '',
			'wrap_before' => '<nav class="wc-breadcrumb" aria-label="' . esc_attr__( 'Breadcrumb', 'marketly' ) . '">',
			'wrap_after'  => '</nav>',
			'before'      => '',
			'after'       => '',
		)
	);
}
add_filter( 'woocommerce_breadcrumb_defaults', 'marketly_breadcrumb_args' );

/* ------------------------------------------------------------- Assets */

/**
 * Whether this request shows WooCommerce content of any kind.
 *
 * Includes the storefront homepage, which renders product cards outside any
 * WooCommerce-owned template.
 *
 * @return bool
 */
function marketly_is_shop_context() {
	if ( ! marketly_has_woocommerce() ) {
		return false;
	}

	return is_woocommerce() || is_cart() || is_checkout() || is_account_page() || is_front_page();
}

/**
 * Replace WooCommerce's stylesheets with the theme's own.
 *
 * WooCommerce ships roughly 110KB of CSS across three files, all of it
 * styling components this theme draws itself. Loading both would mean
 * shipping the weight twice and then fighting it with overrides.
 */
function marketly_dequeue_woocommerce_styles( $enqueue ) {
	unset( $enqueue['woocommerce-general'], $enqueue['woocommerce-layout'], $enqueue['woocommerce-smallscreen'] );

	return $enqueue;
}
add_filter( 'woocommerce_enqueue_styles', 'marketly_dequeue_woocommerce_styles' );

/**
 * Load the WooCommerce stylesheet only where WooCommerce markup appears.
 *
 * Cart tables, checkout forms, account screens and the single product layout
 * are a large slice of CSS that a blog post has no use for. Product card
 * styles stay in the main stylesheet, since the homepage needs them.
 */
function marketly_enqueue_woocommerce_assets() {
	if ( ! marketly_is_shop_context() ) {
		return;
	}

	$css = MARKETLY_DIR . '/assets/css/woocommerce.css';

	wp_enqueue_style(
		'marketly-woocommerce',
		MARKETLY_URI . '/assets/css/woocommerce.css',
		array( 'marketly' ),
		file_exists( $css ) ? (string) filemtime( $css ) : MARKETLY_VERSION
	);

	// WooCommerce loads its add-to-cart script on its own pages only, but the
	// storefront homepage carries the same buttons, so it needs it too.
	if ( is_front_page() && ! is_woocommerce() ) {
		wp_enqueue_script( 'wc-add-to-cart' );
	}
}
add_action( 'wp_enqueue_scripts', 'marketly_enqueue_woocommerce_assets', 20 );

/* ------------------------------------------------- Cart count and fragments */

/**
 * The header cart badge markup, for both first paint and AJAX refreshes.
 *
 * @return string
 */
function marketly_cart_count_html() {
	$count = 0;

	if ( marketly_has_woocommerce() && function_exists( 'WC' ) && WC()->cart ) {
		$count = (int) WC()->cart->get_cart_contents_count();
	}

	return sprintf(
		'<span class="badge badge--count marketly-cart-count"%1$s>%2$s</span>',
		$count ? '' : ' hidden',
		esc_html( number_format_i18n( $count ) )
	);
}

/**
 * Keep the cart badge and the mini-cart in step after an AJAX add.
 *
 * WooCommerce swaps each fragment by selector, so nothing else on the page
 * is touched and no full reload is needed.
 *
 * @param array $fragments Existing fragments.
 * @return array
 */
function marketly_cart_fragments( $fragments ) {
	$fragments['.marketly-cart-count'] = marketly_cart_count_html();

	ob_start();
	?>
	<div class="minicart__contents">
		<?php woocommerce_mini_cart(); ?>
	</div>
	<?php
	$fragments['.minicart__contents'] = (string) ob_get_clean();

	return $fragments;
}
add_filter( 'woocommerce_add_to_cart_fragments', 'marketly_cart_fragments' );

/* -------------------------------------------------------- Small touches */

/**
 * Show a per-product "N in stock" only when stock is genuinely low.
 *
 * @param array      $args    Availability arguments.
 * @param WC_Product $product Product.
 * @return array
 */
function marketly_stock_text( $args, $product ) {
	if ( $product->is_in_stock() && $product->managing_stock() ) {
		$stock = (int) $product->get_stock_quantity();

		if ( $stock > 0 && $stock <= 5 ) {
			$args['availability'] = sprintf(
				/* translators: %s: number of items left in stock. */
				_n( 'Only %s left in stock', 'Only %s left in stock', $stock, 'marketly' ),
				number_format_i18n( $stock )
			);
			$args['class'] = 'stock stock--low';
		}
	}

	return $args;
}
add_filter( 'woocommerce_get_availability', 'marketly_stock_text', 10, 2 );

/**
 * Four related products, to match the archive grid.
 *
 * @param array $args Related product query arguments.
 * @return array
 */
function marketly_related_args( $args ) {
	$args['posts_per_page'] = 4;
	$args['columns']        = 4;

	return $args;
}
add_filter( 'woocommerce_output_related_products_args', 'marketly_related_args', 20 );

/**
 * Tag WooCommerce's generated form fields so the stylesheet can reach them.
 *
 * @param array  $args Field arguments.
 * @param string $key  Field key.
 * @return array
 */
function marketly_form_field_args( $args, $key ) {
	$args['input_class'][] = 'marketly-input';

	return $args;
}
add_filter( 'woocommerce_form_field_args', 'marketly_form_field_args', 10, 2 );

/* ----------------------------------------------------------- Off-canvas */

/**
 * Render the mini cart panel after the footer.
 */
function marketly_render_minicart() {
	get_template_part( 'template-parts/mini-cart' );
}
add_action( 'marketly_after_footer', 'marketly_render_minicart', 20 );

/* ------------------------------------------------------ Wishlist endpoint */

/**
 * Register the route that renders saved products.
 *
 * The wishlist lives in the visitor's own browser, so the server is only ever
 * asked to draw cards for ids it is handed. Nothing is stored, nothing is
 * personal, and the response contains only what a product archive already
 * shows publicly — so the route is readable without authentication. What it
 * does enforce is that every id resolves to a published, catalogue-visible
 * product, and that the list has a hard ceiling.
 */
function marketly_register_wishlist_route() {
	register_rest_route(
		'marketly/v1',
		'/wishlist',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'marketly_wishlist_response',
			'permission_callback' => '__return_true',
			'args'                => array(
				'ids' => array(
					'required'          => true,
					'type'              => 'string',
					'validate_callback' => static function ( $value ) {
						// Digits and commas only — nothing else can reach the query.
						return is_string( $value ) && (bool) preg_match( '/^[0-9]+(,[0-9]+)*$/', $value );
					},
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'marketly_register_wishlist_route' );

/**
 * Render cards for the requested product ids.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function marketly_wishlist_response( $request ) {
	$ids = array_filter( array_map( 'absint', explode( ',', (string) $request->get_param( 'ids' ) ) ) );
	$ids = array_slice( array_unique( $ids ), 0, 48 );

	if ( ! $ids || ! function_exists( 'wc_get_products' ) ) {
		return rest_ensure_response( array( 'count' => 0, 'html' => '' ) );
	}

	$products = wc_get_products(
		array(
			'status'     => 'publish',
			'include'    => $ids,
			'limit'      => count( $ids ),
			'visibility' => 'catalog',
		)
	);

	// Preserve the order the visitor saved them in, which wc_get_products
	// does not guarantee.
	$by_id = array();

	foreach ( $products as $product ) {
		$by_id[ $product->get_id() ] = $product;
	}

	ob_start();

	foreach ( $ids as $id ) {
		if ( isset( $by_id[ $id ] ) ) {
			get_template_part(
				'template-parts/card',
				'product',
				array( 'product' => $by_id[ $id ], 'layout' => 'v', 'heading' => 'h2' )
			);
		}
	}

	return rest_ensure_response(
		array(
			'count' => count( $products ),
			// Ids that no longer resolve — deleted, drafted or hidden — are
			// reported so the browser can prune them from its stored list.
			'found' => array_map( 'intval', array_keys( $by_id ) ),
			'html'  => (string) ob_get_clean(),
		)
	);
}

/* --------------------------------------------------- Gallery script weight */

/**
 * Skip the product gallery libraries when there is no gallery.
 *
 * The zoom, slider and lightbox libraries together are about 62KB of
 * JavaScript, enqueued on every product page because the theme declares
 * support for them. A product with a single image has nothing to slide
 * through, zoom into or open in a lightbox, so on those pages the libraries
 * are pure weight.
 *
 * The three flags are filtered as well as the scripts dequeued: WooCommerce's
 * single-product script reads them to decide whether to initialise, and
 * removing the libraries without clearing the flags would leave it calling
 * methods that no longer exist.
 */
function marketly_trim_gallery_scripts() {
	if ( ! function_exists( 'is_product' ) || ! is_product() ) {
		return;
	}

	$product = wc_get_product( get_queried_object_id() );

	if ( ! $product || $product->get_gallery_image_ids() ) {
		return; // A real gallery — leave everything in place.
	}

	foreach ( array( 'zoom', 'flexslider', 'photoswipe', 'photoswipe-ui-default' ) as $handle ) {
		wp_dequeue_script( $handle );
	}

	wp_dequeue_style( 'photoswipe' );
	wp_dequeue_style( 'photoswipe-default-skin' );

	// WooCommerce prints PhotoSwipe's dialog markup in the footer regardless
	// of whether its script loaded, and that markup is hidden by PhotoSwipe's
	// own stylesheet. Dropping the CSS without the markup leaves the dialog's
	// toolbar rendered across the page as six stray buttons.
	// Registered by WC_Frontend_Scripts::load_scripts() with add_action's
	// default priority, so the removal must use 10 — naming any other
	// priority makes remove_action a silent no-op.
	remove_action( 'wp_footer', 'woocommerce_photoswipe', 10 );

	add_filter( 'woocommerce_single_product_zoom_enabled', '__return_false' );
	add_filter( 'woocommerce_single_product_flexslider_enabled', '__return_false' );
	add_filter( 'woocommerce_single_product_photoswipe_enabled', '__return_false' );
}
add_action( 'wp_enqueue_scripts', 'marketly_trim_gallery_scripts', 99 );

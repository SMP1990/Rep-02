<?php
/**
 * Customizer controls for the homepage sections.
 *
 * Split from inc/customizer.php, which owns the panel, the sanitisers and the
 * registration helper. Defaults are contributed through the marketly_defaults
 * filter rather than by editing that file.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

/**
 * Default values for the storefront sections.
 *
 * @param array $defaults Existing defaults.
 * @return array
 */
function marketly_storefront_defaults( $defaults ) {
	return array_merge(
		$defaults,
		array(
			// Category strip.
			'cat_count'        => 6,

			// Hero.
			'hero_enable'      => true,
			'hero_eyebrow'     => __( 'Premium Quality. Premium You.', 'marketly' ),
			'hero_heading'     => __( 'Everything You Need, All in', 'marketly' ),
			'hero_highlight'   => __( 'One Place', 'marketly' ),
			'hero_text'        => __( 'Discover millions of products from top brands and trusted sellers. Best prices, premium quality & unbeatable service.', 'marketly' ),
			'hero_cta1_text'   => __( 'Shop Now', 'marketly' ),
			'hero_cta1_url'    => '',
			'hero_cta2_text'   => __( 'Explore Deals', 'marketly' ),
			'hero_cta2_url'    => '',
			'hero_image'       => 0,
			'hero_badge_top'   => __( 'Up to', 'marketly' ),
			'hero_badge_value' => __( '60%', 'marketly' ),
			'hero_badge_low'   => __( 'Off', 'marketly' ),

			// Trust strip.
			'trust1_title'     => __( 'Free Shipping', 'marketly' ),
			'trust1_text'      => __( 'On orders over $49', 'marketly' ),
			'trust2_title'     => __( 'Easy Returns', 'marketly' ),
			'trust2_text'      => __( '30-day return policy', 'marketly' ),
			'trust3_title'     => __( 'Secure Payment', 'marketly' ),
			'trust3_text'      => __( '100% protected', 'marketly' ),

			// Flash deal.
			'deal_enable'      => true,
			'shopby_enable'    => false,
			'deal_product'     => 0,
			'deal_ends'        => '',
			'deal_title'       => __( 'Flash Deal', 'marketly' ),
			'deal_subtitle'    => __( 'Limited Time Offer', 'marketly' ),
			'deal_cta'         => __( 'Shop the Deal', 'marketly' ),

			// Product shelves.
			'featured_count'   => 4,
			'bestseller_count' => 8,

			// Promo banners.
			'promo_heading'    => __( 'Trusted by Top Brands', 'marketly' ),
			'promo1_title'     => __( 'Summer Collection', 'marketly' ),
			'promo1_sub'       => __( 'Up to 50% Off', 'marketly' ),
			'promo1_note'      => __( 'On Fashion & Accessories', 'marketly' ),
			'promo1_cta'       => __( 'Shop Now', 'marketly' ),
			'promo1_url'       => '',
			'promo1_image'     => 0,
			'promo1_style'     => 'amber',
			'promo2_title'     => __( 'Home Essentials', 'marketly' ),
			'promo2_sub'       => __( 'Up to 40% Off', 'marketly' ),
			'promo2_note'      => __( 'On Home & Kitchen', 'marketly' ),
			'promo2_cta'       => __( 'Shop Now', 'marketly' ),
			'promo2_url'       => '',
			'promo2_image'     => 0,
			'promo2_style'     => 'blue',

			// Newsletter.
			'news_enable'      => true,
			'news_title'       => __( 'Get Exclusive Offers & Updates', 'marketly' ),
			'news_text'        => __( 'Join our newsletter and save more on your favorite products.', 'marketly' ),
		)
	);
}
add_filter( 'marketly_defaults', 'marketly_storefront_defaults' );

/**
 * On-sale products, as Customizer select choices.
 *
 * A flash deal is by definition a discounted product, so the list is scoped to
 * what is actually on sale rather than every product in the catalogue — which
 * would be an unusable dropdown on a real store.
 *
 * @return array<int|string, string>
 */
function marketly_deal_choices() {
	$choices = array( 0 => __( '— Select a product —', 'marketly' ) );

	if ( ! marketly_has_woocommerce() ) {
		return $choices;
	}

	foreach ( marketly_get_sale_products( 60 ) as $product ) {
		$choices[ $product->get_id() ] = sprintf(
			'%s (#%d)',
			wp_strip_all_tags( $product->get_name() ),
			$product->get_id()
		);
	}

	// Keep a product that has since come off sale visible, so selecting it
	// again is not required just because a sale ended.
	$current = (int) marketly_option( 'deal_product' );

	if ( $current && ! isset( $choices[ $current ] ) && function_exists( 'wc_get_product' ) ) {
		$product = wc_get_product( $current );

		if ( $product ) {
			$choices[ $current ] = sprintf(
				/* translators: %s: product name. */
				__( '%s (not currently on sale)', 'marketly' ),
				wp_strip_all_tags( $product->get_name() )
			);
		}
	}

	return $choices;
}

/**
 * Register the storefront sections.
 *
 * @param WP_Customize_Manager $wp_customize Customizer manager.
 */
function marketly_customize_storefront( $wp_customize ) {

	/* ----------------------------------------------------------- Hero */

	$wp_customize->add_section(
		'marketly_hero',
		array(
			'title'       => __( 'Hero Banner', 'marketly' ),
			'description' => __( 'The large banner at the top of the homepage.', 'marketly' ),
			'panel'       => 'marketly',
			'priority'    => 40,
		)
	);

	$hero_fields = array(
		'hero_enable'      => array( __( 'Show the hero banner', 'marketly' ), 'checkbox', 'marketly_sanitize_checkbox' ),
		'hero_eyebrow'     => array( __( 'Small line above the heading', 'marketly' ), 'text', 'sanitize_text_field' ),
		'hero_heading'     => array( __( 'Heading', 'marketly' ), 'text', 'sanitize_text_field' ),
		'hero_highlight'   => array( __( 'Heading — highlighted words', 'marketly' ), 'text', 'sanitize_text_field' ),
		'hero_text'        => array( __( 'Supporting text', 'marketly' ), 'textarea', 'marketly_sanitize_html' ),
		'hero_cta1_text'   => array( __( 'Primary button label', 'marketly' ), 'text', 'sanitize_text_field' ),
		'hero_cta1_url'    => array( __( 'Primary button link', 'marketly' ), 'url', 'esc_url_raw' ),
		'hero_cta2_text'   => array( __( 'Secondary button label', 'marketly' ), 'text', 'sanitize_text_field' ),
		'hero_cta2_url'    => array( __( 'Secondary button link', 'marketly' ), 'url', 'esc_url_raw' ),
		'hero_image'       => array( __( 'Banner image', 'marketly' ), 'image', 'marketly_sanitize_image_id' ),
		'hero_badge_top'   => array( __( 'Badge — top line', 'marketly' ), 'text', 'sanitize_text_field' ),
		'hero_badge_value' => array( __( 'Badge — large value', 'marketly' ), 'text', 'sanitize_text_field' ),
		'hero_badge_low'   => array( __( 'Badge — bottom line', 'marketly' ), 'text', 'sanitize_text_field' ),
		'trust1_title'     => array( __( 'Trust item 1 — title', 'marketly' ), 'text', 'sanitize_text_field' ),
		'trust1_text'      => array( __( 'Trust item 1 — detail', 'marketly' ), 'text', 'sanitize_text_field' ),
		'trust2_title'     => array( __( 'Trust item 2 — title', 'marketly' ), 'text', 'sanitize_text_field' ),
		'trust2_text'      => array( __( 'Trust item 2 — detail', 'marketly' ), 'text', 'sanitize_text_field' ),
		'trust3_title'     => array( __( 'Trust item 3 — title', 'marketly' ), 'text', 'sanitize_text_field' ),
		'trust3_text'      => array( __( 'Trust item 3 — detail', 'marketly' ), 'text', 'sanitize_text_field' ),
	);

	$priority = 10;

	foreach ( $hero_fields as $key => $field ) {
		marketly_customize_field(
			$wp_customize,
			$key,
			array(
				'section'  => 'marketly_hero',
				'label'    => $field[0],
				'type'     => $field[1],
				'sanitize' => $field[2],
				'priority' => $priority,
			)
		);

		$priority += 5;
	}

	/* ----------------------------------------------------- Flash deal */

	$wp_customize->add_section(
		'marketly_deal',
		array(
			'title'       => __( 'Flash Deal', 'marketly' ),
			'description' => __( 'A countdown band promoting one discounted product. The price, image and link are read from the product itself, so they never go stale. The band hides itself once the deadline passes.', 'marketly' ),
			'panel'       => 'marketly',
			'priority'    => 50,
		)
	);

	marketly_customize_field(
		$wp_customize,
		'deal_enable',
		array(
			'section'  => 'marketly_deal',
			'label'    => __( 'Show the flash deal', 'marketly' ),
			'type'     => 'checkbox',
			'sanitize' => 'marketly_sanitize_checkbox',
			'priority' => 10,
		)
	);

	marketly_customize_field(
		$wp_customize,
		'deal_product',
		array(
			'section'     => 'marketly_deal',
			'label'       => __( 'Product', 'marketly' ),
			'description' => __( 'Products currently on sale. Put a product on sale to see it here.', 'marketly' ),
			'type'        => 'select',
			'choices'     => marketly_deal_choices(),
			'sanitize'    => 'marketly_sanitize_id',
			'priority'    => 20,
		)
	);

	marketly_customize_field(
		$wp_customize,
		'deal_ends',
		array(
			'section'     => 'marketly_deal',
			'label'       => __( 'Ends at', 'marketly' ),
			'description' => __( 'In your site’s timezone. The band disappears once this passes.', 'marketly' ),
			'type'        => 'datetime-local',
			'sanitize'    => 'marketly_sanitize_datetime',
			'priority'    => 30,
		)
	);

	foreach ( array(
		'deal_title'    => __( 'Title', 'marketly' ),
		'deal_subtitle' => __( 'Subtitle', 'marketly' ),
		'deal_cta'      => __( 'Button label', 'marketly' ),
	) as $key => $label ) {
		marketly_customize_field(
			$wp_customize,
			$key,
			array(
				'section'  => 'marketly_deal',
				'label'    => $label,
				'priority' => 40,
			)
		);
	}

	/* ------------------------------------------------ Product shelves */

	$wp_customize->add_section(
		'marketly_shelves',
		array(
			'title'       => __( 'Product Shelves', 'marketly' ),
			'description' => __( 'How many items each homepage row shows. Products themselves come straight from WooCommerce.', 'marketly' ),
			'panel'       => 'marketly',
			'priority'    => 60,
		)
	);

	foreach ( array(
		'cat_count'        => array( __( 'Category tiles', 'marketly' ), __( 'Top-level product categories in the strip under the search bar.', 'marketly' ) ),
		'featured_count'   => array( __( 'Featured products', 'marketly' ), __( 'Products starred in the products list. Falls back to the newest products.', 'marketly' ) ),
		'bestseller_count' => array( __( 'Best sellers', 'marketly' ), __( 'Ordered by WooCommerce’s own sales counter.', 'marketly' ) ),
	) as $key => $labels ) {
		marketly_customize_field(
			$wp_customize,
			$key,
			array(
				'section'     => 'marketly_shelves',
				'label'       => $labels[0],
				'description' => $labels[1],
				'type'        => 'number',
				'sanitize'    => 'marketly_sanitize_count',
				'input_attrs' => array(
					'min'  => 0,
					'max'  => 24,
					'step' => 1,
				),
			)
		);
	}

	marketly_customize_field(
		$wp_customize,
		'shopby_enable',
		array(
			'section'     => 'marketly_shelves',
			'label'       => __( 'Show the “Shop by what matters” filter row', 'marketly' ),
			'description' => __( 'A category and status filter over a live product grid, on the homepage. Off by default: the storefront leads with its shelves, and the catalogue is where filtering belongs. Switching it on also loads the filter script here.', 'marketly' ),
			'type'        => 'checkbox',
			'sanitize'    => 'marketly_sanitize_checkbox',
			'priority'    => 40,
		)
	);

	/* ---------------------------------------------- Promotion banners */

	$wp_customize->add_section(
		'marketly_promos',
		array(
			'title'    => __( 'Promotion Banners', 'marketly' ),
			'panel'    => 'marketly',
			'priority' => 70,
		)
	);

	marketly_customize_field(
		$wp_customize,
		'promo_heading',
		array(
			'section'  => 'marketly_promos',
			'label'    => __( 'Section heading', 'marketly' ),
			'priority' => 10,
		)
	);

	$priority = 20;

	foreach ( array( 1, 2 ) as $n ) {
		$fields = array(
			"promo{$n}_title" => array(
				/* translators: %d: banner number. */
				sprintf( __( 'Banner %d — title', 'marketly' ), $n ),
				'text',
				'sanitize_text_field',
			),
			"promo{$n}_sub"   => array( __( 'Subtitle', 'marketly' ), 'text', 'sanitize_text_field' ),
			"promo{$n}_note"  => array( __( 'Small print', 'marketly' ), 'text', 'sanitize_text_field' ),
			"promo{$n}_cta"   => array( __( 'Button label', 'marketly' ), 'text', 'sanitize_text_field' ),
			"promo{$n}_url"   => array( __( 'Button link', 'marketly' ), 'url', 'esc_url_raw' ),
			"promo{$n}_image" => array( __( 'Image', 'marketly' ), 'image', 'marketly_sanitize_image_id' ),
		);

		foreach ( $fields as $key => $field ) {
			marketly_customize_field(
				$wp_customize,
				$key,
				array(
					'section'  => 'marketly_promos',
					'label'    => $field[0],
					'type'     => $field[1],
					'sanitize' => $field[2],
					'priority' => $priority,
				)
			);

			$priority += 2;
		}

		marketly_customize_field(
			$wp_customize,
			"promo{$n}_style",
			array(
				'section'  => 'marketly_promos',
				'label'    => __( 'Colour', 'marketly' ),
				'type'     => 'select',
				'choices'  => array(
					'amber' => __( 'Amber', 'marketly' ),
					'blue'  => __( 'Blue', 'marketly' ),
					'dark'  => __( 'Dark', 'marketly' ),
				),
				'sanitize' => 'marketly_sanitize_select',
				'priority' => $priority,
			)
		);

		$priority += 2;
	}

	/* ---------------------------------------------------- Newsletter */

	$wp_customize->add_section(
		'marketly_newsletter',
		array(
			'title'       => __( 'Newsletter', 'marketly' ),
			'description' => __( 'Signups are stored under Testimonials → Subscribers.', 'marketly' ),
			'panel'       => 'marketly',
			'priority'    => 80,
		)
	);

	marketly_customize_field(
		$wp_customize,
		'news_enable',
		array(
			'section'  => 'marketly_newsletter',
			'label'    => __( 'Show the newsletter block', 'marketly' ),
			'type'     => 'checkbox',
			'sanitize' => 'marketly_sanitize_checkbox',
			'priority' => 10,
		)
	);

	marketly_customize_field(
		$wp_customize,
		'news_title',
		array(
			'section'  => 'marketly_newsletter',
			'label'    => __( 'Heading', 'marketly' ),
			'priority' => 20,
		)
	);

	marketly_customize_field(
		$wp_customize,
		'news_text',
		array(
			'section'  => 'marketly_newsletter',
			'label'    => __( 'Supporting text', 'marketly' ),
			'type'     => 'textarea',
			'sanitize' => 'marketly_sanitize_html',
			'priority' => 30,
		)
	);
}
add_action( 'customize_register', 'marketly_customize_storefront', 20 );

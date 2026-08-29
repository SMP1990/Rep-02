<?php
/**
 * Customizer settings.
 *
 * Everything the owner might reasonably want to change without touching code —
 * contact details, hero copy and imagery, the stats ribbon, social links —
 * lives here rather than being hardcoded in a template.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register the Haven panel and its sections.
 *
 * @param WP_Customize_Manager $wp_customize Customizer instance.
 */
function haven_customize_register( $wp_customize ) {
	$wp_customize->get_setting( 'blogname' )->transport         = 'postMessage';
	$wp_customize->get_setting( 'blogdescription' )->transport  = 'postMessage';

	$wp_customize->add_panel(
		'haven',
		array(
			'title'       => __( 'Haven Realty', 'haven' ),
			'description' => __( 'Site-wide content for the Haven templates.', 'haven' ),
			'priority'    => 20,
		)
	);

	// ---------------------------------------------------------------- Brand.
	$wp_customize->add_section(
		'haven_brand',
		array(
			'title' => __( 'Brand', 'haven' ),
			'panel' => 'haven',
		)
	);

	haven_add_setting( $wp_customize, 'haven_brand_word', 'Haven', 'haven_brand', __( 'Wordmark', 'haven' ), 'text', __( 'The large word in the logo. Its first letter becomes the monogram.', 'haven' ) );
	haven_add_setting( $wp_customize, 'haven_brand_tagline', 'Realty Group', 'haven_brand', __( 'Wordmark Kicker', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_announcement', 'Exclusive Ultra-Prime Portfolios in Malibu, Miami, and Aspen', 'haven_brand', __( 'Announcement Bar', 'haven' ), 'text', __( 'Leave blank to hide the bar above the header.', 'haven' ) );
	haven_add_setting( $wp_customize, 'haven_currency_code', 'USD', 'haven_brand', __( 'Currency', 'haven' ), 'select', '', array(
		'USD' => 'USD ($)',
		'EUR' => 'EUR (€)',
		'GBP' => 'GBP (£)',
		'AED' => 'AED',
		'PKR' => 'PKR (Rs)',
		'AUD' => 'AUD (A$)',
		'CAD' => 'CAD (C$)',
	) );

	// -------------------------------------------------------------- Contact.
	$wp_customize->add_section(
		'haven_contact',
		array(
			'title' => __( 'Contact & Agent', 'haven' ),
			'panel' => 'haven',
		)
	);

	haven_add_setting( $wp_customize, 'haven_contact_phone', '', 'haven_contact', __( 'Phone', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_contact_email', get_option( 'admin_email' ), 'haven_contact', __( 'Email', 'haven' ), 'email', __( 'Where inquiries and consultation requests are sent.', 'haven' ) );
	haven_add_setting( $wp_customize, 'haven_contact_address', '', 'haven_contact', __( 'Office Address', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_agent_name', get_bloginfo( 'name' ), 'haven_contact', __( 'Default Agent Name', 'haven' ), 'text', __( 'Used on listings that do not name their own representative.', 'haven' ) );
	haven_add_setting( $wp_customize, 'haven_price_range', '$$$$', 'haven_contact', __( 'Price Range (structured data)', 'haven' ), 'text' );

	$wp_customize->add_setting(
		'haven_agent_photo_id',
		array(
			'default'           => 0,
			'sanitize_callback' => 'absint',
			'transport'         => 'refresh',
		)
	);
	$wp_customize->add_control(
		new WP_Customize_Media_Control(
			$wp_customize,
			'haven_agent_photo_id',
			array(
				'label'     => __( 'Default Agent Photo', 'haven' ),
				'section'   => 'haven_contact',
				'mime_type' => 'image',
			)
		)
	);

	// ----------------------------------------------------------------- Hero.
	$wp_customize->add_section(
		'haven_hero',
		array(
			'title' => __( 'Home — Hero', 'haven' ),
			'panel' => 'haven',
		)
	);

	haven_add_setting( $wp_customize, 'haven_hero_eyebrow', 'Find. Love. Live.', 'haven_hero', __( 'Eyebrow', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_hero_title', 'Find a Home', 'haven_hero', __( 'Headline', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_hero_title_accent', 'That Fits Your Lifestyle', 'haven_hero', __( 'Headline (italic second line)', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_hero_subtitle', 'Discover exceptional properties in prime locations and secure your perfect place to call home.', 'haven_hero', __( 'Subtitle', 'haven' ), 'textarea' );
	haven_add_setting( $wp_customize, 'haven_hero_image_fallback', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=85', 'haven_hero', __( 'Fallback Hero Image URL', 'haven' ), 'url', __( 'Used only until you upload your own hero image below. Replace it with your own photography before launch.', 'haven' ) );

	$wp_customize->add_setting(
		'haven_hero_image_id',
		array(
			'default'           => 0,
			'sanitize_callback' => 'absint',
			'transport'         => 'refresh',
		)
	);
	$wp_customize->add_control(
		new WP_Customize_Media_Control(
			$wp_customize,
			'haven_hero_image_id',
			array(
				'label'       => __( 'Hero Image', 'haven' ),
				'description' => __( 'At least 2000px wide. This is the page’s largest element, so upload a compressed image.', 'haven' ),
				'section'     => 'haven_hero',
				'mime_type'   => 'image',
			)
		)
	);

	// ---------------------------------------------------------------- Stats.
	$wp_customize->add_section(
		'haven_stats',
		array(
			'title'       => __( 'Home — Stats Ribbon', 'haven' ),
			'description' => __( 'Leave a value blank to hide that column.', 'haven' ),
			'panel'       => 'haven',
		)
	);

	$stat_defaults = array(
		1 => array( '20+', 'Years of Experience' ),
		2 => array( '1,250+', 'Properties Sold' ),
		3 => array( '98%', 'Client Satisfaction' ),
		4 => array( '$950M+', 'Total Sales Volume' ),
	);

	foreach ( $stat_defaults as $index => $pair ) {
		haven_add_setting( $wp_customize, "haven_stat_{$index}_value", $pair[0], 'haven_stats', sprintf( /* translators: %d: column number */ __( 'Stat %d — Value', 'haven' ), $index ), 'text' );
		haven_add_setting( $wp_customize, "haven_stat_{$index}_label", $pair[1], 'haven_stats', sprintf( /* translators: %d: column number */ __( 'Stat %d — Label', 'haven' ), $index ), 'text' );
	}

	// ---------------------------------------------------------------- About.
	$wp_customize->add_section(
		'haven_about',
		array(
			'title' => __( 'Home — About', 'haven' ),
			'panel' => 'haven',
		)
	);

	haven_add_setting( $wp_customize, 'haven_about_eyebrow', 'About Haven Realty', 'haven_about', __( 'Eyebrow', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_about_title', 'Your Trusted Partner', 'haven_about', __( 'Heading', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_about_title_accent', 'in Real Estate', 'haven_about', __( 'Heading (italic second line)', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_about_body', 'At Haven Realty Group, we believe a home is more than just a place — it’s where your story begins. We’re committed to helping you find the perfect space to live, grow, and create lasting memories with unrivalled access to the world’s most distinguished properties.', 'haven_about', __( 'Body', 'haven' ), 'textarea' );
	haven_add_setting( $wp_customize, 'haven_about_point_1', 'Personalised service tailored to your exact lifestyle', 'haven_about', __( 'Point 1', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_about_point_2', 'Decades of deep market expertise & off-market access', 'haven_about', __( 'Point 2', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_about_point_3', 'Integrity & absolute discretion at every step', 'haven_about', __( 'Point 3', 'haven' ), 'text' );
	haven_add_setting( $wp_customize, 'haven_about_video_url', '', 'haven_about', __( 'Video URL', 'haven' ), 'url', __( 'YouTube or Vimeo. The player loads only when a visitor presses play.', 'haven' ) );
	haven_add_setting( $wp_customize, 'haven_about_image_fallback', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80', 'haven_about', __( 'Fallback About Image URL', 'haven' ), 'url' );

	$wp_customize->add_setting(
		'haven_about_image_id',
		array(
			'default'           => 0,
			'sanitize_callback' => 'absint',
			'transport'         => 'refresh',
		)
	);
	$wp_customize->add_control(
		new WP_Customize_Media_Control(
			$wp_customize,
			'haven_about_image_id',
			array(
				'label'     => __( 'About Image', 'haven' ),
				'section'   => 'haven_about',
				'mime_type' => 'image',
			)
		)
	);

	// --------------------------------------------------------------- Social.
	$wp_customize->add_section(
		'haven_social',
		array(
			'title' => __( 'Social Links', 'haven' ),
			'panel' => 'haven',
		)
	);

	haven_add_setting( $wp_customize, 'haven_social_facebook', '', 'haven_social', __( 'Facebook URL', 'haven' ), 'url' );
	haven_add_setting( $wp_customize, 'haven_social_instagram', '', 'haven_social', __( 'Instagram URL', 'haven' ), 'url' );
	haven_add_setting( $wp_customize, 'haven_social_linkedin', '', 'haven_social', __( 'LinkedIn URL', 'haven' ), 'url' );
	haven_add_setting( $wp_customize, 'haven_social_youtube', '', 'haven_social', __( 'YouTube URL', 'haven' ), 'url' );
	haven_add_setting( $wp_customize, 'haven_twitter_handle', '', 'haven_social', __( 'X / Twitter Handle', 'haven' ), 'text', __( 'Without the @. Used for Twitter card attribution.', 'haven' ) );

	// ------------------------------------------------------------------ SEO.
	$wp_customize->add_section(
		'haven_seo',
		array(
			'title' => __( 'Search Appearance', 'haven' ),
			'panel' => 'haven',
		)
	);

	$wp_customize->add_setting(
		'haven_default_social_image_id',
		array(
			'default'           => 0,
			'sanitize_callback' => 'absint',
		)
	);
	$wp_customize->add_control(
		new WP_Customize_Media_Control(
			$wp_customize,
			'haven_default_social_image_id',
			array(
				'label'       => __( 'Default Share Image', 'haven' ),
				'description' => __( 'Used on pages with no featured image. 1200×630 works best.', 'haven' ),
				'section'     => 'haven_seo',
				'mime_type'   => 'image',
			)
		)
	);

	haven_add_setting( $wp_customize, 'haven_analytics_id', '', 'haven_seo', __( 'Google Analytics / GA4 Measurement ID', 'haven' ), 'text', __( 'e.g. G-XXXXXXX. Leave blank to load no analytics at all.', 'haven' ) );

	// Live-preview bindings.
	$wp_customize->selective_refresh->add_partial(
		'blogname',
		array(
			'selector'        => '.brand__word',
			'render_callback' => static function () {
				return get_theme_mod( 'haven_brand_word', get_bloginfo( 'name' ) );
			},
		)
	);
}
add_action( 'customize_register', 'haven_customize_register' );

/**
 * Add one setting plus its control in a single call.
 *
 * @param WP_Customize_Manager $wp_customize Customizer.
 * @param string               $id           Setting ID.
 * @param mixed                $default      Default value.
 * @param string               $section      Section ID.
 * @param string               $label        Control label.
 * @param string               $type         Control type.
 * @param string               $description  Optional description.
 * @param array                $choices      Options for a select.
 */
function haven_add_setting( $wp_customize, $id, $default, $section, $label, $type = 'text', $description = '', $choices = array() ) {
	$sanitizers = array(
		'text'     => 'sanitize_text_field',
		'textarea' => 'sanitize_textarea_field',
		'url'      => 'esc_url_raw',
		'email'    => 'sanitize_email',
		'select'   => 'sanitize_text_field',
	);

	$wp_customize->add_setting(
		$id,
		array(
			'default'           => $default,
			'sanitize_callback' => isset( $sanitizers[ $type ] ) ? $sanitizers[ $type ] : 'sanitize_text_field',
			'transport'         => 'refresh',
		)
	);

	$args = array(
		'label'       => $label,
		'section'     => $section,
		'type'        => 'select' === $type ? 'select' : ( 'textarea' === $type ? 'textarea' : ( 'url' === $type ? 'url' : ( 'email' === $type ? 'email' : 'text' ) ) ),
		'description' => $description,
	);

	if ( $choices ) {
		$args['choices'] = $choices;
	}

	$wp_customize->add_control( $id, $args );
}

/**
 * Print the GA4 snippet, only when a measurement ID has been entered.
 *
 * Hand-coded rather than pulled in with an analytics plugin.
 */
function haven_analytics() {
	$id = get_theme_mod( 'haven_analytics_id', '' );

	if ( ! $id || is_customize_preview() || is_user_logged_in() ) {
		return;
	}

	printf(
		'<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>' . "\n",
		esc_attr( $id )
	);

	printf(
		'<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config",%s);</script>' . "\n",
		wp_json_encode( $id )
	);
}
add_action( 'wp_footer', 'haven_analytics', 99 );

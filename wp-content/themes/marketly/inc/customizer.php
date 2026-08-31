<?php
/**
 * Customizer scaffold.
 *
 * Every editable string, image and toggle on the storefront is registered
 * here, so nothing visible to a visitor is hard-coded in a template. Later
 * phases add their own sections through marketly_customize_field(); this file
 * owns the panel, the defaults registry and the sanitisers they all share.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

/**
 * Default values for every theme setting.
 *
 * One place to look up what a setting falls back to when the owner has not
 * touched it, so templates never repeat a default inline.
 *
 * @return array<string, mixed>
 */
function marketly_defaults() {
	$defaults = array(
		'brand_tagline' => __( 'Shop Smart, Live Better', 'marketly' ),
	);

	/**
	 * Filter the theme's default setting values.
	 *
	 * @param array<string, mixed> $defaults Setting key => default value.
	 */
	return apply_filters( 'marketly_defaults', $defaults );
}

/**
 * Read a theme setting, falling back to its registered default.
 *
 * @param string $key     Setting key, without the marketly_ prefix.
 * @param mixed  $default Optional explicit fallback.
 * @return mixed
 */
function marketly_option( $key, $default = null ) {
	$defaults = marketly_defaults();

	if ( null === $default && isset( $defaults[ $key ] ) ) {
		$default = $defaults[ $key ];
	}

	return get_theme_mod( 'marketly_' . $key, $default );
}

/* -------------------------------------------------------------- Sanitisers */

/**
 * Sanitise a checkbox.
 *
 * @param mixed $value Raw value.
 * @return bool
 */
function marketly_sanitize_checkbox( $value ) {
	return (bool) $value;
}

/**
 * Sanitise a select against its registered choices.
 *
 * @param string               $value   Raw value.
 * @param WP_Customize_Setting $setting Setting instance.
 * @return string
 */
function marketly_sanitize_select( $value, $setting ) {
	$value   = sanitize_key( $value );
	$control = $setting->manager->get_control( $setting->id );
	$choices = ( $control && ! empty( $control->choices ) ) ? $control->choices : array();

	return array_key_exists( $value, $choices ) ? $value : $setting->default;
}

/**
 * Sanitise a positive integer, clamped to a sane ceiling.
 *
 * @param mixed $value Raw value.
 * @return int
 */
function marketly_sanitize_count( $value ) {
	// Cast, then clamp. absint() would turn -5 into 5 rather than rejecting it.
	return max( 0, min( 48, (int) $value ) );
}

/**
 * Sanitise an attachment ID.
 *
 * @param mixed $value Raw value.
 * @return int
 */
function marketly_sanitize_image_id( $value ) {
	$id = absint( $value );

	return ( $id && wp_attachment_is_image( $id ) ) ? $id : 0;
}

/**
 * Sanitise a post or term ID that must exist.
 *
 * @param mixed $value Raw value.
 * @return int
 */
function marketly_sanitize_id( $value ) {
	return absint( $value );
}

/**
 * Sanitise a hex colour, allowing an empty value to mean "use the token".
 *
 * @param mixed $value Raw value.
 * @return string
 */
function marketly_sanitize_hex( $value ) {
	$value = sanitize_hex_color( (string) $value );

	return $value ? $value : '';
}

/**
 * Sanitise a datetime-local value into a normalised Y-m-d H:i string.
 *
 * @param mixed $value Raw value.
 * @return string
 */
function marketly_sanitize_datetime( $value ) {
	$value = sanitize_text_field( (string) $value );

	if ( '' === $value ) {
		return '';
	}

	$time = strtotime( str_replace( 'T', ' ', $value ) );

	return $time ? gmdate( 'Y-m-d H:i', $time ) : '';
}

/**
 * Sanitise a short block of copy, allowing only inline emphasis.
 *
 * @param mixed $value Raw value.
 * @return string
 */
function marketly_sanitize_html( $value ) {
	return wp_kses(
		(string) $value,
		array(
			'strong' => array(),
			'em'     => array(),
			'br'     => array(),
			'span'   => array( 'class' => array() ),
		)
	);
}

/* ------------------------------------------------------ Registration helper */

/**
 * Register one Customizer setting and its control in a single call.
 *
 * Every setting registered this way is sanitised — the sanitise_callback is
 * required, not optional, so an unsanitised setting cannot be added by
 * accident in a later phase.
 *
 * @param WP_Customize_Manager $wp_customize Customizer manager.
 * @param string               $key          Setting key without the prefix.
 * @param array                $args         Control arguments.
 */
function marketly_customize_field( $wp_customize, $key, $args ) {
	$args = wp_parse_args(
		$args,
		array(
			'section'     => '',
			'label'       => '',
			'description' => '',
			'type'        => 'text',
			'choices'     => array(),
			'sanitize'    => 'sanitize_text_field',
			'transport'   => 'refresh',
			'priority'    => 10,
			'input_attrs' => array(),
			'active'      => null,
		)
	);

	$defaults = marketly_defaults();
	$default  = isset( $defaults[ $key ] ) ? $defaults[ $key ] : '';
	$id       = 'marketly_' . $key;

	$wp_customize->add_setting(
		$id,
		array(
			'default'           => $default,
			'sanitize_callback' => $args['sanitize'],
			'transport'         => $args['transport'],
			'capability'        => 'edit_theme_options',
		)
	);

	$control_args = array(
		'label'       => $args['label'],
		'description' => $args['description'],
		'section'     => $args['section'],
		'priority'    => $args['priority'],
		'settings'    => $id,
	);

	if ( $args['input_attrs'] ) {
		$control_args['input_attrs'] = $args['input_attrs'];
	}

	if ( is_callable( $args['active'] ) ) {
		$control_args['active_callback'] = $args['active'];
	}

	switch ( $args['type'] ) {
		case 'image':
			$wp_customize->add_control(
				new WP_Customize_Media_Control(
					$wp_customize,
					$id,
					array_merge( $control_args, array( 'mime_type' => 'image' ) )
				)
			);
			break;

		case 'color':
			$wp_customize->add_control( new WP_Customize_Color_Control( $wp_customize, $id, $control_args ) );
			break;

		case 'select':
		case 'radio':
			$control_args['type']    = $args['type'];
			$control_args['choices'] = $args['choices'];
			$wp_customize->add_control( $id, $control_args );
			break;

		default:
			$control_args['type'] = $args['type'];
			$wp_customize->add_control( $id, $control_args );
	}
}

/* --------------------------------------------------------------- The panel */

/**
 * Register the Marketly panel and the sections later phases attach to.
 *
 * @param WP_Customize_Manager $wp_customize Customizer manager.
 */
function marketly_customize_register( $wp_customize ) {
	$wp_customize->add_panel(
		'marketly',
		array(
			'title'       => __( 'Marketly Storefront', 'marketly' ),
			'description' => __( 'Everything the storefront shows that is not a product: the announcement bar, hero, flash deal, promo banners and footer.', 'marketly' ),
			'priority'    => 20,
		)
	);

	$wp_customize->add_section(
		'marketly_brand',
		array(
			'title'    => __( 'Brand', 'marketly' ),
			'panel'    => 'marketly',
			'priority' => 10,
		)
	);

	marketly_customize_field(
		$wp_customize,
		'brand_tagline',
		array(
			'section'     => 'marketly_brand',
			'label'       => __( 'Header tagline', 'marketly' ),
			'description' => __( 'The short line under the site name. Leave empty to hide it.', 'marketly' ),
			'transport'   => 'postMessage',
		)
	);

	// Live-preview the pieces that are pure text, so the owner is not waiting
	// on a full iframe reload while typing.
	if ( isset( $wp_customize->selective_refresh ) ) {
		$wp_customize->selective_refresh->add_partial(
			'marketly_brand_tagline',
			array(
				'selector'        => '.brand__tagline',
				'render_callback' => static function () {
					return esc_html( marketly_option( 'brand_tagline' ) );
				},
			)
		);
	}

	// Core registers these on the same hook, so depending on callback order
	// they may not exist yet. Null-check rather than assume.
	foreach ( array( 'blogname', 'blogdescription' ) as $core_setting ) {
		$setting = $wp_customize->get_setting( $core_setting );

		if ( $setting ) {
			$setting->transport = 'postMessage';
		}
	}
}
add_action( 'customize_register', 'marketly_customize_register' );

<?php
/**
 * Presentation helpers — icons, badges, small view logic.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

/**
 * Inline SVG icon.
 *
 * The original build pulled ~40 icons from lucide-react. These are the same
 * shapes as inline paths: no icon-font request, no JavaScript, and they
 * inherit `currentColor` so a single stylesheet controls them.
 *
 * @param string $name    Icon name.
 * @param string $classes Extra CSS classes.
 * @return string
 */
function haven_icon( $name, $classes = '' ) {
	$paths = array(
		'search'      => '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
		'map-pin'     => '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
		'home'        => '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
		'bed'         => '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
		'bath'        => '<path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-3 3L6 9"/><path d="M2 12h20"/><path d="M4 12v3a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-3"/>',
		'area'        => '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>',
		'heart'       => '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
		'share'       => '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4"/><path d="m15.4 6.5-6.8 4"/>',
		'arrow-right' => '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
		'arrow-up'    => '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
		'chevron-down' => '<path d="m6 9 6 6 6-6"/>',
		'chevron-left' => '<path d="m15 18-6-6 6-6"/>',
		'chevron-right' => '<path d="m9 18 6-6-6-6"/>',
		'check'       => '<path d="M20 6 9 17l-5-5"/>',
		'check-circle' => '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
		'sparkles'    => '<path d="m12 3-1.9 5.8L4 10.7l6.1 1.9L12 18.4l1.9-5.8 6.1-1.9-6.1-1.9Z"/>',
		'shield'      => '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
		'award'       => '<circle cx="12" cy="8" r="6"/><path d="m8.2 13.3-1.4 7.5 5.2-3 5.2 3-1.4-7.5"/>',
		'trending'    => '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
		'dollar'      => '<path d="M12 2v20"/><path d="M17 6.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5S9.2 10 12 10s5 1.6 5 3.5S14.8 17 12 17s-5-1.6-5-3.5"/>',
		'compass'     => '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.9 6.5-6.5 2.9 2.9-6.5Z"/>',
		'key'         => '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 8.6-8.6"/><path d="m17 6 2.5 2.5"/><path d="m14 9 2.5 2.5"/>',
		'play'        => '<path d="M6 4v16l14-8Z"/>',
		'mail'        => '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m2 7 10 6 10-6"/>',
		'phone'       => '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.8a2 2 0 0 1 1.7 2Z"/>',
		'calendar'    => '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
		'clock'       => '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
		'building'    => '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>',
		'calculator'  => '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
		'sliders'     => '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
		'reset'       => '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
		'send'        => '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
		'user-check'  => '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
		'menu'        => '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
		'close'       => '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
		'facebook'    => '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z"/>',
		'instagram'   => '<rect width="20" height="20" x="2" y="2" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
		'linkedin'    => '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
		'youtube'     => '<path d="M22.5 7a2.8 2.8 0 0 0-2-2C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.5.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 5 2.8 2.8 0 0 0 2 2c1.6.5 8.5.5 8.5.5s6.9 0 8.5-.5a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .5-5 29 29 0 0 0-.5-5Z"/><path d="m10 15 5-3-5-3Z"/>',
	);

	if ( ! isset( $paths[ $name ] ) ) {
		return '';
	}

	return sprintf(
		'<svg class="icon %1$s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">%2$s</svg>',
		esc_attr( $classes ),
		$paths[ $name ] // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static markup above.
	);
}

/**
 * Echo an icon.
 *
 * @param string $name    Icon name.
 * @param string $classes Extra CSS classes.
 */
function haven_the_icon( $name, $classes = '' ) {
	echo haven_icon( $name, $classes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in haven_icon().
}

/**
 * Whether the current request is any property listing archive.
 *
 * @return bool
 */
function haven_is_property_archive() {
	return is_post_type_archive( 'property' )
		|| is_tax( array( 'property_type', 'property_location', 'property_purpose', 'property_amenity' ) );
}

/**
 * The URL to preload as the Largest Contentful Paint candidate.
 *
 * @return string
 */
function haven_lcp_image_url() {
	if ( is_front_page() ) {
		$id = (int) get_theme_mod( 'haven_hero_image_id', 0 );

		if ( $id ) {
			$src = wp_get_attachment_image_src( $id, 'haven-hero' );

			return $src ? $src[0] : '';
		}

		return (string) get_theme_mod( 'haven_hero_image_fallback', '' );
	}

	if ( is_singular( 'property' ) && has_post_thumbnail() ) {
		$src = wp_get_attachment_image_src( get_post_thumbnail_id(), 'haven-gallery' );

		return $src ? $src[0] : '';
	}

	return '';
}

/**
 * Render the site brand lockup.
 *
 * @param string $variant 'light' on dark backgrounds, 'dark' otherwise.
 */
function haven_brand( $variant = 'dark' ) {
	$name = get_bloginfo( 'name' );
	$tag  = get_theme_mod( 'haven_brand_tagline', __( 'Realty Group', 'haven' ) );

	// Split "Haven Realty Group" into a monogram + wordmark + kicker.
	$word = get_theme_mod( 'haven_brand_word', strtok( $name, ' ' ) );
	$word = $word ? $word : $name;

	printf(
		'<a class="brand brand--%1$s" href="%2$s" rel="home">
			<span class="brand__mark" aria-hidden="true">%3$s</span>
			<span class="brand__text">
				<span class="brand__word">%4$s</span>
				<span class="brand__kicker">%5$s</span>
			</span>
		</a>',
		esc_attr( $variant ),
		esc_url( home_url( '/' ) ),
		esc_html( mb_substr( $word, 0, 1 ) ),
		esc_html( $word ),
		esc_html( $tag )
	);
}

/**
 * Status banner shown after a form submission redirect.
 */
function haven_form_notice() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display-only flag.
	$status = isset( $_GET['haven_status'] ) ? sanitize_key( wp_unslash( $_GET['haven_status'] ) ) : '';

	if ( ! $status || ! class_exists( 'Haven_Forms' ) ) {
		return;
	}

	$notice = Haven_Forms::status_message( $status );

	if ( ! $notice ) {
		return;
	}

	printf(
		'<div class="notice-bar notice-bar--%1$s" role="status">%2$s<span>%3$s</span></div>',
		esc_attr( $notice['type'] ),
		haven_icon( 'success' === $notice['type'] ? 'check-circle' : 'close' ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		esc_html( $notice['message'] )
	);
}

/**
 * The purpose badge shown on cards and the detail page, e.g. "For Sale".
 *
 * @param int|null $post_id Property ID.
 * @return string
 */
function haven_purpose_label( $post_id = null ) {
	$purpose = haven_first_term( 'property_purpose', $post_id );

	if ( $purpose ) {
		return $purpose;
	}

	return haven_is_rental( $post_id ) ? __( 'For Rent', 'haven' ) : __( 'For Sale', 'haven' );
}

/**
 * Build a filter URL that keeps every current filter except the ones overridden.
 *
 * @param array $overrides Query args to change.
 * @return string
 */
function haven_filter_url( $overrides = array() ) {
	$current = class_exists( 'Haven_Query' ) ? Haven_Query::current_filters() : array();
	$args    = array();

	foreach ( $current as $key => $value ) {
		if ( 'amenity' === $key ) {
			$value = $value ? implode( ',', $value ) : '';
		}

		if ( '' !== $value && array() !== $value ) {
			$args[ $key ] = $value;
		}
	}

	$args = array_merge( $args, $overrides );
	$args = array_filter(
		$args,
		static function ( $value ) {
			return '' !== $value && null !== $value;
		}
	);

	return haven_archive_url( $args );
}

/**
 * A `<select>` of taxonomy terms used across the search forms.
 *
 * @param string $taxonomy Taxonomy slug.
 * @param string $name     Field name.
 * @param string $selected Selected term slug.
 * @param string $any      Label for the empty option.
 */
function haven_term_select( $taxonomy, $name, $selected = '', $any = '' ) {
	$terms = get_terms(
		array(
			'taxonomy'   => $taxonomy,
			'hide_empty' => false,
			'orderby'    => 'name',
		)
	);

	if ( is_wp_error( $terms ) ) {
		return;
	}

	printf( '<select name="%s" id="haven-%s">', esc_attr( $name ), esc_attr( $name ) );
	printf( '<option value="">%s</option>', esc_html( $any ) );

	foreach ( $terms as $term ) {
		$prefix = $term->parent ? '— ' : '';

		printf(
			'<option value="%1$s" %2$s>%3$s</option>',
			esc_attr( $term->slug ),
			selected( $selected, $term->slug, false ),
			esc_html( $prefix . $term->name )
		);
	}

	echo '</select>';
}

/**
 * Pagination styled to match the theme.
 */
function haven_pagination() {
	$links = paginate_links(
		array(
			'mid_size'  => 1,
			'end_size'  => 1,
			'prev_text' => haven_icon( 'chevron-left' ) . '<span class="screen-reader-text">' . esc_html__( 'Previous', 'haven' ) . '</span>',
			'next_text' => '<span class="screen-reader-text">' . esc_html__( 'Next', 'haven' ) . '</span>' . haven_icon( 'chevron-right' ),
			'type'      => 'array',
		)
	);

	if ( ! $links ) {
		return;
	}

	echo '<nav class="pagination" aria-label="' . esc_attr__( 'Property pagination', 'haven' ) . '"><ul>';

	foreach ( $links as $link ) {
		echo '<li>' . wp_kses_post( $link ) . '</li>';
	}

	echo '</ul></nav>';
}

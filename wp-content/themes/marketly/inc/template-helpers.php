<?php
/**
 * Shared template helpers.
 *
 * Icons are inline SVG rendered from a single path table. That keeps the icon
 * set to zero HTTP requests, zero font files and zero layout shift, and means
 * every icon inherits currentColor and the surrounding font size.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

/**
 * The icon path table.
 *
 * Every icon is drawn on a 24x24 grid as stroked paths, matching the reference
 * design's outline style. Filled icons set their own fill in the path.
 *
 * @return array<string, string>
 */
function marketly_icon_paths() {
	static $paths = null;

	if ( null !== $paths ) {
		return $paths;
	}

	$paths = array(
		// Navigation and chrome.
		'menu'          => '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
		'close'         => '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
		'search'        => '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
		'user'          => '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
		'heart'         => '<path d="M12 20.5s-7.5-4.6-9.3-9A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 9.3 4.9c-1.8 4.4-9.3 9-9.3 9Z"/>',
		'cart'          => '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h2.5l2.4 12.1a1.6 1.6 0 0 0 1.6 1.3h9.3a1.6 1.6 0 0 0 1.6-1.3L21 7H5.6"/>',
		'bag'           => '<path d="M4 8h16l-1.2 12.2a1.6 1.6 0 0 1-1.6 1.4H6.8a1.6 1.6 0 0 1-1.6-1.4Z"/><path d="M8.5 11V6.8a3.5 3.5 0 0 1 7 0V11"/>',
		'home'          => '<path d="m3 10 9-7 9 7v10a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 20Z"/><path d="M9.5 21.6V13h5v8.6"/>',
		'grid'          => '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
		'tag'           => '<path d="M20.6 13.4 13.4 20.6a1.6 1.6 0 0 1-2.3 0l-8-8V3.4h9.2l8.3 8.3a1.6 1.6 0 0 1 0 1.7Z"/><circle cx="7.6" cy="7.6" r="1.4"/>',
		'dots'          => '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',

		// Arrows and chevrons.
		'arrow-right'   => '<path d="M4 12h15"/><path d="m13 5 7 7-7 7"/>',
		'arrow-left'    => '<path d="M20 12H5"/><path d="m11 5-7 7 7 7"/>',
		'chevron-right' => '<path d="m9 5 7 7-7 7"/>',
		'chevron-left'  => '<path d="m15 5-7 7 7 7"/>',
		'chevron-down'  => '<path d="m5 9 7 7 7-7"/>',
		'chevron-up'    => '<path d="m5 15 7-7 7 7"/>',

		// Trust strip and value props.
		'truck'         => '<path d="M2 6.5h10.5v10H2z"/><path d="M12.5 10h4.2l3.3 3.3v3.2h-7.5z"/><circle cx="6.5" cy="18.5" r="1.8"/><circle cx="17" cy="18.5" r="1.8"/>',
		'refresh'       => '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.8 4.2v5h-5"/>',
		'shield'        => '<path d="M12 2.6 4.5 5.5v6c0 4.8 3.2 8.4 7.5 9.9 4.3-1.5 7.5-5.1 7.5-9.9v-6Z"/><path d="m9 12 2.2 2.2L15.2 10"/>',
		'zap'           => '<path d="M13.2 2 4.5 13.4h6L9.8 22l8.7-11.4h-6Z" fill="currentColor" stroke="none"/>',
		'mail'          => '<rect x="2.5" y="5" width="19" height="14" rx="2.2"/><path d="m3 6.5 8.1 5.7a1.6 1.6 0 0 0 1.8 0L21 6.5"/>',
		'headset'       => '<path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="2.5" y="13" width="4.5" height="6.5" rx="1.8"/><rect x="17" y="13" width="4.5" height="6.5" rx="1.8"/>',

		// Product and commerce.
		'star'          => '<path d="m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9Z"/>',
		'plus'          => '<path d="M12 5v14"/><path d="M5 12h14"/>',
		'minus'         => '<path d="M5 12h14"/>',
		'check'         => '<path d="m20 6-11 11-5-5"/>',
		'filter'        => '<path d="M3 5h18"/><path d="M6.5 12h11"/><path d="M10 19h4"/>',
		'trash'         => '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6 7l1 13.2a1.6 1.6 0 0 0 1.6 1.3h6.8A1.6 1.6 0 0 0 17 20.2L18 7"/>',
		'eye'           => '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
	);

	/**
	 * Filter the icon path table so child themes can add or replace icons.
	 *
	 * @param array<string, string> $paths Icon name => raw SVG path markup.
	 */
	return apply_filters( 'marketly_icon_paths', $paths );
}

/**
 * Return an inline SVG icon.
 *
 * The markup is theme-authored, never user input — the path table above is the
 * only source — so it is safe to echo. Callers still pass class names and
 * labels through escaping.
 *
 * @param string $name  Icon name from the path table.
 * @param array  $args  Optional. size, class, label, stroke_width, fill.
 * @return string SVG markup, or an empty string for an unknown icon.
 */
function marketly_get_icon( $name, $args = array() ) {
	$paths = marketly_icon_paths();

	if ( ! isset( $paths[ $name ] ) ) {
		return '';
	}

	$args = wp_parse_args(
		$args,
		array(
			'size'         => 24,
			'class'        => '',
			'label'        => '',
			'stroke_width' => 1.8,
			'fill'         => 'none',
		)
	);

	$classes = trim( 'icon icon--' . $name . ' ' . $args['class'] );

	// An icon with a label is meaningful content; one without is decoration.
	$a11y = $args['label']
		? ' role="img" aria-label="' . esc_attr( $args['label'] ) . '"'
		: ' aria-hidden="true" focusable="false"';

	return sprintf(
		'<svg class="%1$s" width="%2$s" height="%2$s" viewBox="0 0 24 24" fill="%3$s" stroke="currentColor" stroke-width="%4$s" stroke-linecap="round" stroke-linejoin="round"%5$s>%6$s</svg>',
		esc_attr( $classes ),
		esc_attr( (string) $args['size'] ),
		esc_attr( $args['fill'] ),
		esc_attr( (string) $args['stroke_width'] ),
		$a11y, // Built from escaped values above.
		$paths[ $name ] // Theme-authored markup from the table above.
	);
}

/**
 * Echo an inline SVG icon.
 *
 * @param string $name Icon name.
 * @param array  $args Optional icon arguments.
 */
function marketly_icon( $name, $args = array() ) {
	echo marketly_get_icon( $name, $args ); // phpcs:ignore WordPress.Security.EscapingOutput.OutputNotEscaped -- Theme-authored SVG, escaped internally.
}

/**
 * Render a section heading with an optional "View All" link.
 *
 * Used by every homepage rail so the heading rhythm stays identical.
 *
 * @param array $args title, link, link_text, level, id.
 */
function marketly_section_head( $args = array() ) {
	$args = wp_parse_args(
		$args,
		array(
			'title'     => '',
			'link'      => '',
			'link_text' => __( 'View All', 'marketly' ),
			'level'     => 'h2',
			'id'        => '',
		)
	);

	if ( '' === $args['title'] ) {
		return;
	}

	$level = in_array( $args['level'], array( 'h1', 'h2', 'h3' ), true ) ? $args['level'] : 'h2';
	?>
	<div class="section__head">
		<<?php echo esc_attr( $level ); ?> class="section__title"
			<?php echo $args['id'] ? ' id="' . esc_attr( $args['id'] ) . '"' : ''; ?>>
			<?php echo esc_html( $args['title'] ); ?>
		</<?php echo esc_attr( $level ); ?>>

		<?php if ( $args['link'] ) : ?>
			<a class="section__more" href="<?php echo esc_url( $args['link'] ); ?>">
				<?php echo esc_html( $args['link_text'] ); ?>
				<?php marketly_icon( 'arrow-right', array( 'size' => 16 ) ); ?>
				<span class="screen-reader-text">
					<?php
					/* translators: %s: section name, e.g. Featured Products. */
					printf( esc_html__( ' — %s', 'marketly' ), esc_html( $args['title'] ) );
					?>
				</span>
			</a>
		<?php endif; ?>
	</div>
	<?php
}

/**
 * Render a star rating as accessible markup.
 *
 * Two stacked star rows clipped by width — one greyed, one gold — so half
 * stars are exact without needing half-star glyphs.
 *
 * @param float $rating Rating from 0 to 5.
 * @param int   $count  Optional review count shown beside the stars.
 * @param bool  $echo   Whether to echo. Default true.
 * @return string Markup when $echo is false.
 */
function marketly_rating_stars( $rating, $count = 0, $echo = true ) {
	$rating  = max( 0, min( 5, (float) $rating ) );
	$count   = (int) $count;
	$percent = ( $rating / 5 ) * 100;
	$star    = marketly_get_icon( 'star', array( 'size' => 14, 'fill' => 'currentColor', 'stroke_width' => 0 ) );

	$label = sprintf(
		/* translators: %s: rating out of five, e.g. 4.5. */
		__( 'Rated %s out of 5', 'marketly' ),
		number_format_i18n( $rating, 1 )
	);

	ob_start();
	?>
	<div class="rating">
		<span class="rating__stars" role="img" aria-label="<?php echo esc_attr( $label ); ?>">
			<span class="rating__track" aria-hidden="true"><?php echo str_repeat( $star, 5 ); // phpcs:ignore WordPress.Security.EscapingOutput.OutputNotEscaped -- Theme-authored SVG. ?></span>
			<span class="rating__fill" style="width:<?php echo esc_attr( round( $percent, 2 ) ); ?>%" aria-hidden="true"><?php echo str_repeat( $star, 5 ); // phpcs:ignore WordPress.Security.EscapingOutput.OutputNotEscaped -- Theme-authored SVG. ?></span>
		</span>

		<?php if ( $count > 0 ) : ?>
			<span class="rating__count">
				(<?php echo esc_html( number_format_i18n( $count ) ); ?>)
				<span class="screen-reader-text">
					<?php
					/* translators: %s: number of customer reviews. */
					printf( esc_html( _n( '%s review', '%s reviews', $count, 'marketly' ) ), esc_html( number_format_i18n( $count ) ) );
					?>
				</span>
			</span>
		<?php endif; ?>
	</div>
	<?php
	$html = (string) ob_get_clean();

	if ( ! $echo ) {
		return $html;
	}

	echo $html; // phpcs:ignore WordPress.Security.EscapingOutput.OutputNotEscaped -- Escaped above.
	return '';
}

/**
 * Format a large number the way the reference does: "20,000+ items".
 *
 * Only adds the "+" above a threshold, so a store with 8 items reads "8 items"
 * rather than an inflated "8+ items".
 *
 * @param int $count     The real count.
 * @param int $threshold Round and suffix at or above this. Default 100.
 * @return string
 */
function marketly_format_count( $count, $threshold = 100 ) {
	$count = (int) $count;

	if ( $count < $threshold ) {
		return number_format_i18n( $count );
	}

	// Round down to a clean figure so the "+" is always truthful.
	$step    = $count >= 10000 ? 1000 : ( $count >= 1000 ? 100 : 10 );
	$rounded = (int) ( floor( $count / $step ) * $step );

	// Nothing was rounded away, so there is no "and more" to claim.
	if ( $rounded === $count ) {
		return number_format_i18n( $count );
	}

	return number_format_i18n( $rounded ) . '+';
}

/**
 * Escape and return a phone number usable in a tel: href.
 *
 * @param string $phone Raw phone number.
 * @return string
 */
function marketly_tel( $phone ) {
	return preg_replace( '/[^0-9+]/', '', (string) $phone );
}

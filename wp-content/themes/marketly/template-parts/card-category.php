<?php
/**
 * A product category card, used by the Popular Categories grid.
 *
 * @param array $args term (WP_Term).
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_term = isset( $args['term'] ) ? $args['term'] : null;

if ( ! $marketly_term instanceof WP_Term ) {
	return;
}

$marketly_image = marketly_category_image_id( $marketly_term );
?>
<a class="card ccard" href="<?php echo esc_url( (string) get_term_link( $marketly_term ) ); ?>">
	<span class="ccard__media">
		<?php if ( $marketly_image ) : ?>
			<?php
			echo wp_get_attachment_image(
				$marketly_image,
				'marketly-thumb',
				false,
				array(
					'class'   => 'ccard__img',
					'loading' => 'lazy',
					'alt'     => '',
				)
			);
			?>
		<?php else : ?>
			<span class="ccard__fallback" aria-hidden="true">
				<?php marketly_icon( 'grid', array( 'size' => 22 ) ); ?>
			</span>
		<?php endif; ?>
	</span>

	<span class="ccard__text">
		<span class="ccard__name"><?php echo esc_html( $marketly_term->name ); ?></span>
		<span class="ccard__count">
			<?php
			printf(
				/* translators: %s: formatted product count, e.g. 20,000+. */
				esc_html( _n( '%s item', '%s items', (int) $marketly_term->count, 'marketly' ) ),
				esc_html( marketly_format_count( (int) $marketly_term->count ) )
			);
			?>
		</span>
	</span>
</a>

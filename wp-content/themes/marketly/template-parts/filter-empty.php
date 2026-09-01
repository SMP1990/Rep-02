<?php
/**
 * What the catalogue shows when a filter set matches nothing.
 *
 * A dead end is the one place a filter panel most often loses people, so
 * this offers a way back rather than an apology: the choices that are
 * currently narrowing the results, each removable on its own, and a single
 * link that clears everything.
 *
 * @param array $args state (array), base (string).
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_state = isset( $args['state'] ) && is_array( $args['state'] ) ? $args['state'] : marketly_filter_state();
$marketly_base  = isset( $args['base'] ) ? (string) $args['base'] : marketly_filter_base_url();
$marketly_chips = marketly_filter_chips( $marketly_state, $marketly_base );
?>
<div class="cfempty">
	<span class="cfempty__icon" aria-hidden="true">
		<?php marketly_icon( 'search', array( 'size' => 26 ) ); ?>
	</span>

	<h2 class="cfempty__title"><?php esc_html_e( 'No products match these filters', 'marketly' ); ?></h2>

	<p class="cfempty__text">
		<?php esc_html_e( 'Try removing one of your choices — or clear them all and start again.', 'marketly' ); ?>
	</p>

	<?php if ( $marketly_chips ) : ?>
		<div class="cfempty__chips">
			<?php foreach ( $marketly_chips as $marketly_chip ) : ?>
				<a class="cfactive__chip" href="<?php echo esc_url( $marketly_chip['url'] ); ?>">
					<span><?php echo esc_html( $marketly_chip['label'] ); ?></span>
					<?php marketly_icon( 'close', array( 'size' => 11 ) ); ?>
					<span class="screen-reader-text">
						<?php
						printf(
							/* translators: %s: name of the filter being removed. */
							esc_html__( 'Remove filter: %s', 'marketly' ),
							esc_html( $marketly_chip['label'] )
						);
						?>
					</span>
				</a>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>

	<a class="btn btn--primary" href="<?php echo esc_url( $marketly_base ); ?>" data-cf-reset>
		<?php esc_html_e( 'Clear all filters', 'marketly' ); ?>
	</a>
</div>

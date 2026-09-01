<?php
/**
 * The flash deal band.
 *
 * The product's image, price and link are read live from WooCommerce, so
 * editing the product updates the band. The countdown is rendered from a
 * server-computed UTC timestamp and ticked client-side, which keeps it
 * correct regardless of the visitor's timezone.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

if ( ! marketly_option( 'deal_enable' ) || ! marketly_deal_is_live() ) {
	return;
}

$marketly_product  = marketly_get_deal_product();
$marketly_deadline = marketly_deal_deadline();
$marketly_cta      = trim( (string) marketly_option( 'deal_cta' ) );

$marketly_units = array(
	'days'    => __( 'Days', 'marketly' ),
	'hours'   => __( 'Hrs', 'marketly' ),
	'minutes' => __( 'Mins', 'marketly' ),
	'seconds' => __( 'Secs', 'marketly' ),
);

// Rendered server-side too, so the numbers are right before JavaScript runs
// and remain readable if it never does.
$marketly_left  = max( 0, $marketly_deadline - time() );
$marketly_parts = array(
	'days'    => (int) floor( $marketly_left / DAY_IN_SECONDS ),
	'hours'   => (int) floor( ( $marketly_left % DAY_IN_SECONDS ) / HOUR_IN_SECONDS ),
	'minutes' => (int) floor( ( $marketly_left % HOUR_IN_SECONDS ) / MINUTE_IN_SECONDS ),
	'seconds' => (int) ( $marketly_left % MINUTE_IN_SECONDS ),
);
?>
<section class="section deal" aria-labelledby="deal-title">
	<div class="container">
		<div class="deal__panel">

			<a class="deal__media" href="<?php echo esc_url( $marketly_product->get_permalink() ); ?>"
				tabindex="-1" aria-hidden="true">
				<?php
				echo wp_kses_post(
					$marketly_product->get_image(
						'marketly-thumb',
						array(
							'class'   => 'deal__img',
							'loading' => 'lazy',
						)
					)
				);
				?>
			</a>

			<div class="deal__body">
				<h2 class="deal__title" id="deal-title">
					<?php marketly_icon( 'zap', array( 'size' => 18 ) ); ?>
					<?php echo esc_html( marketly_option( 'deal_title' ) ); ?>
				</h2>

				<?php if ( marketly_option( 'deal_subtitle' ) ) : ?>
					<p class="deal__sub"><?php echo esc_html( marketly_option( 'deal_subtitle' ) ); ?></p>
				<?php endif; ?>

				<p class="deal__label"><?php esc_html_e( 'Special Price', 'marketly' ); ?></p>

				<div class="deal__price price">
					<?php echo wp_kses_post( $marketly_product->get_price_html() ); ?>
				</div>

				<p class="deal__name">
					<a href="<?php echo esc_url( $marketly_product->get_permalink() ); ?>">
						<?php echo esc_html( $marketly_product->get_name() ); ?>
					</a>
				</p>

				<?php if ( $marketly_cta ) : ?>
					<a class="btn btn--accent deal__cta" href="<?php echo esc_url( $marketly_product->get_permalink() ); ?>">
						<?php echo esc_html( $marketly_cta ); ?>
					</a>
				<?php endif; ?>
			</div>

			<div class="deal__timer" data-marketly-countdown
				data-deadline="<?php echo esc_attr( gmdate( 'c', $marketly_deadline ) ); ?>">

				<p class="screen-reader-text">
					<?php
					printf(
						/* translators: %s: date and time the offer ends. */
						esc_html__( 'Offer ends %s', 'marketly' ),
						esc_html(
							wp_date(
								get_option( 'date_format' ) . ' ' . get_option( 'time_format' ),
								$marketly_deadline
							)
						)
					);
					?>
				</p>

				<?php foreach ( $marketly_units as $marketly_key => $marketly_label ) : ?>
					<span class="deal__unit" aria-hidden="true">
						<span class="deal__num" data-unit="<?php echo esc_attr( $marketly_key ); ?>">
							<?php echo esc_html( str_pad( (string) $marketly_parts[ $marketly_key ], 2, '0', STR_PAD_LEFT ) ); ?>
						</span>
						<span class="deal__unit-label"><?php echo esc_html( $marketly_label ); ?></span>
					</span>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
</section>

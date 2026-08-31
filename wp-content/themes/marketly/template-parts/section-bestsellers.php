<?php
/**
 * Best Sellers — ordered by WooCommerce's own sales counter, in a rail that
 * scrolls on small screens and becomes a grid on desktop.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_products = marketly_get_best_sellers( (int) marketly_option( 'bestseller_count' ) );

if ( ! $marketly_products ) {
	return;
}
?>
<section class="section" aria-labelledby="bestsellers-title">
	<div class="container">
		<?php
		marketly_section_head(
			array(
				'title' => __( 'Best Sellers', 'marketly' ),
				'link'  => marketly_shop_url(),
				'id'    => 'bestsellers-title',
			)
		);
		?>

		<div class="rail">
			<?php foreach ( $marketly_products as $marketly_product ) : ?>
				<?php
				get_template_part(
					'template-parts/card',
					'product',
					array(
						'product' => $marketly_product,
						'layout'  => 'v',
					)
				);
				?>
			<?php endforeach; ?>
		</div>
	</div>
</section>

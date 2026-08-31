<?php
/**
 * Featured Products — the starred products, in the horizontal card layout.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_products = marketly_get_featured_products( (int) marketly_option( 'featured_count' ) );

if ( ! $marketly_products ) {
	return;
}
?>
<section class="section" aria-labelledby="featured-title">
	<div class="container">
		<?php
		marketly_section_head(
			array(
				'title' => __( 'Featured Products', 'marketly' ),
				'link'  => marketly_shop_url(),
				'id'    => 'featured-title',
			)
		);
		?>

		<div class="grid pgrid">
			<?php foreach ( $marketly_products as $marketly_i => $marketly_product ) : ?>
				<?php
				get_template_part(
					'template-parts/card',
					'product',
					array(
						'product' => $marketly_product,
						'layout'  => 'h',
						// The first row sits near the fold on a phone.
						'eager'   => $marketly_i < 2,
					)
				);
				?>
			<?php endforeach; ?>
		</div>
	</div>
</section>

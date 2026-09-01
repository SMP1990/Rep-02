<?php
/**
 * The product card inside a WooCommerce loop.
 *
 * The theme's only WooCommerce template override, and it holds no markup of
 * its own: it hands off to the same card partial the homepage shelves use, so
 * a product is drawn identically on the shop, in a category, in related
 * products and on the front page.
 *
 * The surrounding woocommerce_before/after_shop_loop_item actions are still
 * fired. WooCommerce's own callbacks are unhooked in inc/woocommerce.php, so
 * only additions from other plugins render there.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

global $product;

if ( empty( $product ) || ! $product->is_visible() ) {
	return;
}
?>
<li <?php wc_product_class( 'pcell', $product ); ?>>
	<?php do_action( 'woocommerce_before_shop_loop_item' ); ?>

	<?php
	get_template_part(
		'template-parts/card',
		'product',
		array(
			'product' => $product,
			'layout'  => 'v',
			// Archive cards follow the page h1, with no section heading between.
			'heading' => 'h2',
		)
	);
	?>

	<?php do_action( 'woocommerce_after_shop_loop_item' ); ?>
</li>

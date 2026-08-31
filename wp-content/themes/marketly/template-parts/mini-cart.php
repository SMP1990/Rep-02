<?php
/**
 * The off-canvas mini cart.
 *
 * Rendered inert on every page and opened by JavaScript. The header's cart
 * icon stays an ordinary link to the cart page, so with scripting off the
 * click simply navigates there instead of doing nothing.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

if ( ! marketly_has_woocommerce() || ! function_exists( 'woocommerce_mini_cart' ) ) {
	return;
}
?>
<div class="drawer drawer--end" id="marketly-minicart" hidden>
	<div class="drawer__backdrop" data-marketly-minicart-close></div>

	<div class="drawer__panel" role="dialog" aria-modal="true"
		aria-label="<?php esc_attr_e( 'Shopping cart', 'marketly' ); ?>">

		<div class="drawer__head">
			<h2 class="minicart__title">
				<?php marketly_icon( 'cart', array( 'size' => 19 ) ); ?>
				<?php esc_html_e( 'Your Cart', 'marketly' ); ?>
			</h2>

			<button type="button" class="btn btn--ghost btn--icon drawer__close" data-marketly-minicart-close>
				<?php marketly_icon( 'close', array( 'size' => 22 ) ); ?>
				<span class="screen-reader-text"><?php esc_html_e( 'Close cart', 'marketly' ); ?></span>
			</button>
		</div>

		<div class="drawer__body minicart">
			<?php // Replaced wholesale by WooCommerce's cart fragments after an AJAX add. ?>
			<div class="minicart__contents">
				<?php woocommerce_mini_cart(); ?>
			</div>
		</div>
	</div>
</div>

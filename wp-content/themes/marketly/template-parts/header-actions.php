<?php
/**
 * Account, wishlist and cart icons in the header.
 *
 * The wishlist count is filled in by JavaScript from localStorage — it is a
 * per-browser list that needs no account and writes nothing to the database.
 * The cart count is real WooCommerce state, printed server-side so it is
 * correct on first paint, then kept live by cart fragments in Phase 4.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_cart_url   = marketly_cart_url();
$marketly_wishlist   = marketly_page_url( 'wishlist' );
$marketly_cart_count = 0;

if ( marketly_has_woocommerce() && function_exists( 'WC' ) && WC()->cart ) {
	$marketly_cart_count = (int) WC()->cart->get_cart_contents_count();
}
?>
<div class="actions">

	<a class="action" href="<?php echo esc_url( marketly_account_url() ); ?>">
		<?php marketly_icon( 'user', array( 'size' => 23 ) ); ?>
		<span class="screen-reader-text"><?php esc_html_e( 'Your account', 'marketly' ); ?></span>
	</a>

	<?php if ( $marketly_wishlist ) : ?>
		<a class="action" href="<?php echo esc_url( $marketly_wishlist ); ?>">
			<?php marketly_icon( 'heart', array( 'size' => 23 ) ); ?>

			<?php // Announced before the badge, so it reads "Your wishlist, 3". ?>
			<span class="screen-reader-text"><?php esc_html_e( 'Your wishlist,', 'marketly' ); ?></span>

			<span class="badge badge--count" data-marketly-wishlist-count hidden>0</span>
		</a>
	<?php endif; ?>

	<?php if ( $marketly_cart_url ) : ?>
		<a class="action" href="<?php echo esc_url( $marketly_cart_url ); ?>">
			<?php marketly_icon( 'cart', array( 'size' => 23 ) ); ?>

			<span class="badge badge--count marketly-cart-count"<?php echo $marketly_cart_count ? '' : ' hidden'; ?>>
				<?php echo esc_html( number_format_i18n( $marketly_cart_count ) ); ?>
			</span>

			<span class="screen-reader-text">
				<?php
				printf(
					/* translators: %s: number of items in the cart. */
					esc_html( _n( 'Your cart, %s item', 'Your cart, %s items', $marketly_cart_count, 'marketly' ) ),
					esc_html( number_format_i18n( $marketly_cart_count ) )
				);
				?>
			</span>
		</a>
	<?php endif; ?>

</div>

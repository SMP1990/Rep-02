<?php
/**
 * The product card.
 *
 * One component, two layouts: "h" puts the image beside the details (the
 * Featured Products grid) and "v" stacks them (the Best Sellers rail and,
 * from Phase 4, every WooCommerce archive). Defining it once is what keeps
 * a product looking identical wherever it appears.
 *
 * Every value is read from the WC_Product — nothing here is hard-coded.
 *
 * @param array $args product (WC_Product), layout (h|v), eager (bool).
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_product = isset( $args['product'] ) ? $args['product'] : null;

if ( ! $marketly_product instanceof WC_Product ) {
	return;
}

$marketly_layout   = ( isset( $args['layout'] ) && 'h' === $args['layout'] ) ? 'h' : 'v';
$marketly_eager    = ! empty( $args['eager'] );
$marketly_id       = $marketly_product->get_id();
$marketly_discount = marketly_discount_percent( $marketly_product );
$marketly_reviews  = (int) $marketly_product->get_review_count();
$marketly_rating   = (float) $marketly_product->get_average_rating();
?>
<article class="pcard pcard--<?php echo esc_attr( $marketly_layout ); ?>">

	<div class="pcard__media">
		<a href="<?php echo esc_url( $marketly_product->get_permalink() ); ?>" tabindex="-1" aria-hidden="true">
			<?php
			// WooCommerce supplies srcset, sizes and a placeholder when a
			// product has no image of its own.
			echo wp_kses_post(
				$marketly_product->get_image(
					'marketly-card',
					array(
						'class'   => 'pcard__img',
						'loading' => $marketly_eager ? 'eager' : 'lazy',
					)
				)
			);
			?>
		</a>

		<?php if ( $marketly_discount > 0 ) : ?>
			<span class="badge badge--sale pcard__badge">
				<?php
				printf(
					/* translators: %s: discount percentage. */
					esc_html__( '-%s%%', 'marketly' ),
					esc_html( number_format_i18n( $marketly_discount ) )
				);
				?>
			</span>
		<?php endif; ?>

		<button type="button" class="pcard__fav" data-marketly-fav
			data-product-id="<?php echo esc_attr( (string) $marketly_id ); ?>"
			aria-pressed="false">
			<?php marketly_icon( 'heart', array( 'size' => 17 ) ); ?>
			<span class="screen-reader-text">
				<?php
				printf(
					/* translators: %s: product name. */
					esc_html__( 'Save %s to your wishlist', 'marketly' ),
					esc_html( wp_strip_all_tags( $marketly_product->get_name() ) )
				);
				?>
			</span>
		</button>
	</div>

	<div class="pcard__body">
		<h3 class="pcard__title">
			<a href="<?php echo esc_url( $marketly_product->get_permalink() ); ?>">
				<?php echo esc_html( $marketly_product->get_name() ); ?>
			</a>
		</h3>

		<?php if ( $marketly_reviews > 0 ) : ?>
			<?php marketly_rating_stars( $marketly_rating, $marketly_reviews ); ?>
		<?php endif; ?>

		<div class="pcard__foot">
			<div class="price pcard__price">
				<?php echo wp_kses_post( $marketly_product->get_price_html() ); ?>
			</div>

			<?php
			// WooCommerce's own loop button, so stock status, product type and
			// the AJAX hooks stay its responsibility rather than ours. The
			// label is swapped for the cart glyph by a filter in
			// inc/storefront.php.
			//
			// loop/add-to-cart.php reads `global $product`, which is only set
			// inside a WooCommerce loop. The homepage shelves are ordinary
			// queries, so the global is set around the call and restored
			// afterwards — without this the button silently renders nothing.
			if ( function_exists( 'woocommerce_template_loop_add_to_cart' ) ) {
				$marketly_prev_product = isset( $GLOBALS['product'] ) ? $GLOBALS['product'] : null;
				$GLOBALS['product']    = $marketly_product;

				// No class argument: passing one REPLACES WooCommerce's own
				// class list, which is where add_to_cart_button and
				// ajax_add_to_cart live. The theme's classes are appended
				// through woocommerce_loop_add_to_cart_args instead.
				woocommerce_template_loop_add_to_cart();

				$GLOBALS['product'] = $marketly_prev_product;
			}
			?>
		</div>
	</div>
</article>

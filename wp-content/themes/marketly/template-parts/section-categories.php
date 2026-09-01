<?php
/**
 * The category strip under the search bar.
 *
 * Live top-level WooCommerce categories, plus an "All" tile pointing at the
 * shop. Renders nothing when the store has no categories yet.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_terms = marketly_get_product_categories( array( 'limit' => (int) marketly_option( 'cat_count' ) ) );

if ( ! $marketly_terms ) {
	return;
}
?>
<nav class="catstrip" aria-label="<?php esc_attr_e( 'Shop by category', 'marketly' ); ?>">
	<div class="container">
		<ul class="catstrip__rail">
			<?php foreach ( $marketly_terms as $marketly_term ) : ?>
				<?php $marketly_image = marketly_category_image_id( $marketly_term ); ?>
				<li>
					<a class="cattile" href="<?php echo esc_url( (string) get_term_link( $marketly_term ) ); ?>">
						<span class="cattile__media">
							<?php if ( $marketly_image ) : ?>
								<?php
								echo wp_get_attachment_image(
									$marketly_image,
									'marketly-thumb',
									false,
									array(
										'class'   => 'cattile__img',
										'loading' => 'lazy',
										'alt'     => '',
									)
								);
								?>
							<?php else : ?>
								<?php marketly_icon( 'grid', array( 'size' => 24 ) ); ?>
							<?php endif; ?>
						</span>
						<span class="cattile__name"><?php echo esc_html( $marketly_term->name ); ?></span>
					</a>
				</li>
			<?php endforeach; ?>

			<li>
				<a class="cattile cattile--all" href="<?php echo esc_url( marketly_shop_url() ); ?>">
					<span class="cattile__media">
						<?php marketly_icon( 'dots', array( 'size' => 24 ) ); ?>
					</span>
					<span class="cattile__name"><?php esc_html_e( 'All', 'marketly' ); ?></span>
				</a>
			</li>
		</ul>
	</div>
</nav>

<?php
/**
 * The storefront's filtered shelf.
 *
 * The reference application's home view is built around a filter strip over a
 * live grid, so the visitor narrows the catalogue without leaving the front
 * page. This is that, reduced to the choices worth making in one row —
 * category, then the four states a shopper actually browses by. Everything
 * else lives in the catalogue's full panel, which the "All filters" link
 * opens.
 *
 * It shares the catalogue's engine outright: the same state, the same query
 * builder, the same endpoint. There is no second definition of what "on sale"
 * means, so the homepage and the shop can never disagree.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

if ( ! marketly_has_woocommerce() || ! function_exists( 'marketly_filter_state' ) ) {
	return;
}

if ( ! marketly_option( 'shopby_enable' ) ) {
	return;
}

// The homepage never reads the request: it is a shelf, not a filtered view,
// and a stray query argument on the front page should not silently rearrange
// it. It starts from the defaults and the script takes it from there.
$marketly_state = marketly_filter_state( array() );

$marketly_cats  = marketly_get_product_categories( 8 );
$marketly_shop  = marketly_shop_url();
$marketly_limit = 8;

$marketly_products = wc_get_products(
	array(
		'status'     => 'publish',
		'visibility' => 'catalog',
		'limit'      => $marketly_limit,
		'orderby'    => 'popularity',
	)
);

if ( ! $marketly_products ) {
	return;
}

$marketly_products = marketly_prime_products( $marketly_products );
?>
<section class="section shopby" aria-labelledby="shopby-title">
	<div class="container">

		<?php
		marketly_section_head(
			array(
				'title' => __( 'Shop by what matters', 'marketly' ),
				'sub'   => __( 'Narrow the catalogue without leaving the page.', 'marketly' ),
				'link'  => $marketly_shop,
				'more'  => __( 'All filters', 'marketly' ),
				'id'    => 'shopby-title',
			)
		);
		?>

		<form class="shopby__bar"
			method="get"
			action="<?php echo esc_url( $marketly_shop ); ?>"
			data-marketly-filter
			data-base="<?php echo esc_url( $marketly_shop ); ?>"
			aria-label="<?php esc_attr_e( 'Filter the storefront', 'marketly' ); ?>">

			<?php /* Categories, as a scrolling row of pills. */ ?>
			<div class="shopby__scroll">
				<ul class="shopby__pills">
					<li>
						<label class="cfchip is-on" data-shopby-pill>
							<input type="radio" name="cat" value="" class="cfchip__input" checked>
							<span><?php esc_html_e( 'All', 'marketly' ); ?></span>
						</label>
					</li>
					<?php foreach ( $marketly_cats as $marketly_cat ) : ?>
						<li>
							<label class="cfchip" data-shopby-pill>
								<input type="radio"
									name="cat"
									value="<?php echo esc_attr( $marketly_cat->slug ); ?>"
									class="cfchip__input">
								<span><?php echo esc_html( $marketly_cat->name ); ?></span>
							</label>
						</li>
					<?php endforeach; ?>
				</ul>
			</div>

			<?php /* The four states worth one tap. */ ?>
			<div class="shopby__states">
				<?php
				$marketly_states = array(
					'sale'     => array( 'flame', __( 'On sale', 'marketly' ) ),
					'top'      => array( 'award', __( 'Bestsellers', 'marketly' ) ),
					'featured' => array( 'zap', __( 'Featured', 'marketly' ) ),
					'instock'  => array( 'shield', __( 'In stock', 'marketly' ) ),
				);

				foreach ( $marketly_states as $marketly_key => $marketly_row ) :
					?>
					<label class="cfchip cfchip--<?php echo esc_attr( $marketly_key ); ?>">
						<input type="checkbox"
							name="<?php echo esc_attr( $marketly_key ); ?>"
							value="1"
							class="cfchip__input">
						<?php marketly_icon( $marketly_row[0], array( 'size' => 13 ) ); ?>
						<span><?php echo esc_html( $marketly_row[1] ); ?></span>
					</label>
				<?php endforeach; ?>

				<button type="submit" class="btn btn--primary btn--sm shopby__go">
					<?php esc_html_e( 'Apply', 'marketly' ); ?>
				</button>
			</div>
		</form>

		<div class="shopby__results"
			data-marketly-results
			data-view="shelf"
			aria-busy="false"
			aria-live="polite"
			data-base="<?php echo esc_url( $marketly_shop ); ?>">
			<div class="pcols">
				<?php
				foreach ( $marketly_products as $marketly_index => $marketly_product ) {
					get_template_part(
						'template-parts/card-product',
						null,
						array(
							'product' => $marketly_product,
							'layout'  => 'v',
							'heading' => 'h3',
							'eager'   => $marketly_index < 4,
						)
					);
				}
				?>
			</div>
		</div>
	</div>
</section>

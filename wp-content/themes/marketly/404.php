<?php
/**
 * 404 — styled, with a way back into the store rather than a dead end.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<div class="container">
	<section class="error-404">
		<p class="error-404__code" aria-hidden="true">404</p>

		<h1 class="error-404__title"><?php esc_html_e( 'We couldn’t find that page', 'marketly' ); ?></h1>

		<p class="error-404__text">
			<?php esc_html_e( 'The link may be out of date, or the product may no longer be available. Try a search, or head back to the storefront.', 'marketly' ); ?>
		</p>

		<div class="error-404__search">
			<?php get_search_form(); ?>
		</div>

		<p class="error-404__actions">
			<a class="btn btn--lg" href="<?php echo esc_url( home_url( '/' ) ); ?>">
				<?php esc_html_e( 'Back to home', 'marketly' ); ?>
			</a>

			<?php
			if ( marketly_has_woocommerce() && function_exists( 'wc_get_page_permalink' ) ) :
				$shop = wc_get_page_permalink( 'shop' );

				if ( $shop ) :
					?>
					<a class="btn btn--outline btn--lg" href="<?php echo esc_url( $shop ); ?>">
						<?php esc_html_e( 'Browse all products', 'marketly' ); ?>
					</a>
					<?php
				endif;
			endif;
			?>
		</p>
	</section>
</div>

<?php
get_footer();

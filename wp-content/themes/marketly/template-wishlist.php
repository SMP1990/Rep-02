<?php
/**
 * Template Name: Wishlist
 *
 * The saved list lives in the visitor's own browser, so the server cannot
 * know what is on it. The page renders its empty state, and JavaScript asks
 * the theme's REST route to render cards for whatever ids are stored.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<div class="container">
	<header class="page-header">
		<h1 class="page-title"><?php the_title(); ?></h1>
		<p class="page-header__desc"><?php esc_html_e( 'Products you have saved on this device.', 'marketly' ); ?></p>
	</header>

	<?php while ( have_posts() ) : the_post(); ?>
		<?php if ( trim( get_the_content() ) ) : ?>
			<div class="entry__content"><?php the_content(); ?></div>
		<?php endif; ?>
	<?php endwhile; ?>

	<?php // Filled in by the wishlist module; announced politely as it changes. ?>
	<div class="wishlist" data-marketly-wishlist-page aria-live="polite" aria-busy="true">
		<p class="wishlist__loading"><?php esc_html_e( 'Loading your saved products…', 'marketly' ); ?></p>
	</div>

	<section class="empty-state wishlist__empty" data-marketly-wishlist-empty hidden>
		<span class="empty-state__icon" aria-hidden="true">
			<?php marketly_icon( 'heart', array( 'size' => 32 ) ); ?>
		</span>

		<h2 class="empty-state__title"><?php esc_html_e( 'Nothing saved yet', 'marketly' ); ?></h2>

		<p class="empty-state__text">
			<?php esc_html_e( 'Tap the heart on any product to keep it here for later.', 'marketly' ); ?>
		</p>

		<p>
			<a class="btn btn--lg" href="<?php echo esc_url( marketly_shop_url() ); ?>">
				<?php esc_html_e( 'Browse products', 'marketly' ); ?>
			</a>
		</p>
	</section>
</div>

<?php
get_footer();

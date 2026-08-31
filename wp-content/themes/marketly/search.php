<?php
/**
 * Search results.
 *
 * Product results are handled by WooCommerce in Phase 4; this covers posts
 * and pages.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<div class="container">
	<header class="page-header">
		<h1 class="page-title">
			<?php
			printf(
				/* translators: %s: search query. */
				esc_html__( 'Results for “%s”', 'marketly' ),
				'<span>' . esc_html( get_search_query() ) . '</span>'
			);
			?>
		</h1>

		<p class="page-header__desc">
			<?php
			$found = (int) $GLOBALS['wp_query']->found_posts;
			printf(
				/* translators: %s: number of results. */
				esc_html( _n( '%s result found', '%s results found', $found, 'marketly' ) ),
				esc_html( number_format_i18n( $found ) )
			);
			?>
		</p>
	</header>

	<?php if ( have_posts() ) : ?>

		<div class="post-list">
			<?php
			while ( have_posts() ) :
				the_post();
				get_template_part( 'template-parts/content', 'search' );
			endwhile;
			?>
		</div>

		<?php
		the_posts_pagination(
			array(
				'mid_size'           => 1,
				'prev_text'          => esc_html__( 'Previous', 'marketly' ),
				'next_text'          => esc_html__( 'Next', 'marketly' ),
				'screen_reader_text' => esc_html__( 'Results navigation', 'marketly' ),
			)
		);
		?>

	<?php else : ?>
		<?php get_template_part( 'template-parts/content', 'none' ); ?>
	<?php endif; ?>
</div>

<?php
get_footer();

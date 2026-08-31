<?php
/**
 * Category, tag, author and date archives.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<div class="container">
	<?php if ( have_posts() ) : ?>

		<header class="page-header">
			<?php
			the_archive_title( '<h1 class="page-title">', '</h1>' );
			the_archive_description( '<div class="page-header__desc">', '</div>' );
			?>
		</header>

		<div class="post-list">
			<?php
			while ( have_posts() ) :
				the_post();
				get_template_part( 'template-parts/content', get_post_type() );
			endwhile;
			?>
		</div>

		<?php
		the_posts_pagination(
			array(
				'mid_size'           => 1,
				'prev_text'          => esc_html__( 'Previous', 'marketly' ),
				'next_text'          => esc_html__( 'Next', 'marketly' ),
				'screen_reader_text' => esc_html__( 'Posts navigation', 'marketly' ),
			)
		);
		?>

	<?php else : ?>
		<?php get_template_part( 'template-parts/content', 'none' ); ?>
	<?php endif; ?>
</div>

<?php
get_footer();

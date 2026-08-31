<?php
/**
 * Single page.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<div class="container">
	<?php
	while ( have_posts() ) :
		the_post();
		?>
		<article id="post-<?php the_ID(); ?>" <?php post_class( 'entry entry--page' ); ?>>
			<header class="entry__header">
				<h1 class="entry__title"><?php the_title(); ?></h1>
			</header>

			<?php if ( has_post_thumbnail() ) : ?>
				<figure class="entry__media">
					<?php the_post_thumbnail( 'large', array( 'loading' => 'eager' ) ); ?>
				</figure>
			<?php endif; ?>

			<div class="entry__content">
				<?php
				the_content();

				wp_link_pages(
					array(
						'before' => '<nav class="page-links" aria-label="' . esc_attr__( 'Page sections', 'marketly' ) . '">',
						'after'  => '</nav>',
					)
				);
				?>
			</div>
		</article>

		<?php
		if ( comments_open() || get_comments_number() ) {
			comments_template();
		}

	endwhile;
	?>
</div>

<?php
get_footer();

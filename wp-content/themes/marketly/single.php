<?php
/**
 * Single blog post.
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
		<article id="post-<?php the_ID(); ?>" <?php post_class( 'entry entry--single' ); ?>>
			<header class="entry__header">
				<h1 class="entry__title"><?php the_title(); ?></h1>

				<p class="entry__meta">
					<time datetime="<?php echo esc_attr( get_the_date( DATE_W3C ) ); ?>">
						<?php echo esc_html( get_the_date() ); ?>
					</time>
					<span class="entry__sep" aria-hidden="true">·</span>
					<span class="entry__author"><?php the_author(); ?></span>
				</p>
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
						'before' => '<nav class="page-links" aria-label="' . esc_attr__( 'Post pages', 'marketly' ) . '">',
						'after'  => '</nav>',
					)
				);
				?>
			</div>

			<?php the_tags( '<footer class="entry__tags">', ', ', '</footer>' ); ?>
		</article>

		<?php
		the_post_navigation(
			array(
				'prev_text' => '<span class="nav-label">' . esc_html__( 'Previous', 'marketly' ) . '</span> %title',
				'next_text' => '<span class="nav-label">' . esc_html__( 'Next', 'marketly' ) . '</span> %title',
			)
		);

		if ( comments_open() || get_comments_number() ) {
			comments_template();
		}

	endwhile;
	?>
</div>

<?php
get_footer();

<?php
/**
 * Standard blog post.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();
	?>

	<article class="page-single">
		<header class="page-single__header">
			<div class="container">
				<p class="eyebrow"><?php echo esc_html( get_the_date() ); ?></p>
				<h1 class="page-single__title"><?php the_title(); ?></h1>
			</div>
		</header>

		<div class="container">
			<?php if ( has_post_thumbnail() ) : ?>
				<figure class="page-single__media">
					<?php the_post_thumbnail( 'haven-gallery', array( 'sizes' => '(max-width: 1280px) 100vw, 1280px' ) ); ?>
				</figure>
			<?php endif; ?>

			<div class="page-single__layout">
				<div class="prose">
					<?php the_content(); ?>
				</div>

				<?php if ( is_active_sidebar( 'sidebar-1' ) ) : ?>
					<aside class="page-single__sidebar">
						<?php dynamic_sidebar( 'sidebar-1' ); ?>
					</aside>
				<?php endif; ?>
			</div>
		</div>
	</article>

	<?php
endwhile;

get_footer();

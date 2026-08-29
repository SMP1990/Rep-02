<?php
/**
 * Standard page.
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
				<h1 class="page-single__title"><?php the_title(); ?></h1>
			</div>
		</header>

		<div class="container">
			<div class="page-single__layout">
				<div class="prose">
					<?php
					the_content();

					wp_link_pages(
						array(
							'before' => '<nav class="page-links">',
							'after'  => '</nav>',
						)
					);
					?>
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

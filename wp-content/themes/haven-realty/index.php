<?php
/**
 * Fallback template — the blog index and any archive without its own template.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<div class="archive">
	<div class="container">

		<header class="archive__header">
			<div>
				<h1 class="archive__title">
					<?php
					if ( is_home() && ! is_front_page() ) {
						echo esc_html( get_the_title( (int) get_option( 'page_for_posts' ) ) );
					} else {
						the_archive_title();
					}
					?>
				</h1>
				<?php the_archive_description( '<div class="archive__description">', '</div>' ); ?>
			</div>
		</header>

		<?php if ( have_posts() ) : ?>

			<div class="post-list">
				<?php
				while ( have_posts() ) :
					the_post();
					get_template_part( 'template-parts/entry', 'summary' );
				endwhile;
				?>
			</div>

			<?php haven_pagination(); ?>

		<?php else : ?>

			<div class="empty-state">
				<span class="empty-state__icon"><?php haven_the_icon( 'search' ); ?></span>
				<h2 class="empty-state__title"><?php esc_html_e( 'Nothing found', 'haven' ); ?></h2>
				<p class="empty-state__body"><?php esc_html_e( 'Try a different search, or browse the property catalog.', 'haven' ); ?></p>
				<a class="btn btn--dark" href="<?php echo esc_url( haven_archive_url() ); ?>">
					<?php esc_html_e( 'Browse Properties', 'haven' ); ?>
				</a>
			</div>

		<?php endif; ?>

	</div>
</div>

<?php
get_footer();

<?php
/**
 * Search results.
 *
 * A property hit gets a full card; anything else gets a text summary.
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
				<p class="eyebrow"><?php esc_html_e( 'Search Results', 'haven' ); ?></p>
				<h1 class="archive__title">
					<?php
					printf(
						/* translators: %s: search query */
						esc_html__( 'Results for “%s”', 'haven' ),
						esc_html( get_search_query() )
					);
					?>
				</h1>
			</div>
		</header>

		<?php if ( have_posts() ) : ?>

			<div class="card-grid">
				<?php
				while ( have_posts() ) :
					the_post();

					if ( 'property' === get_post_type() ) {
						get_template_part( 'template-parts/card', 'property' );
					} else {
						get_template_part( 'template-parts/entry', 'summary' );
					}
				endwhile;
				?>
			</div>

			<?php haven_pagination(); ?>

		<?php else : ?>

			<div class="empty-state">
				<span class="empty-state__icon"><?php haven_the_icon( 'search' ); ?></span>
				<h2 class="empty-state__title"><?php esc_html_e( 'No matches', 'haven' ); ?></h2>
				<p class="empty-state__body"><?php esc_html_e( 'Try a broader term, or search the property catalog directly.', 'haven' ); ?></p>
				<a class="btn btn--dark" href="<?php echo esc_url( haven_archive_url() ); ?>">
					<?php esc_html_e( 'Browse Properties', 'haven' ); ?>
				</a>
			</div>

		<?php endif; ?>

	</div>
</div>

<?php
get_footer();

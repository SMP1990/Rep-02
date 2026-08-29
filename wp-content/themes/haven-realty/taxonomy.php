<?php
/**
 * Property taxonomy archives (type, location, purpose, amenity).
 *
 * These reuse the catalog template so /property-type/villa/ looks and behaves
 * exactly like /properties/ — one template, four crawlable archive families.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

if ( is_tax( array( 'property_type', 'property_location', 'property_purpose', 'property_amenity' ) ) ) {
	get_template_part( 'archive', 'property' );
	return;
}

get_header();
?>

<div class="archive">
	<div class="container">
		<header class="archive__header">
			<div>
				<h1 class="archive__title"><?php single_term_title(); ?></h1>
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
		<?php endif; ?>
	</div>
</div>

<?php
get_footer();

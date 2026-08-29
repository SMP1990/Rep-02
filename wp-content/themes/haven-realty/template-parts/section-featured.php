<?php
/**
 * Featured properties — a live query, so publishing a listing and ticking
 * "Featured" is the only step needed to change what appears here.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

$haven_featured = new WP_Query(
	array(
		'post_type'           => 'property',
		'post_status'         => 'publish',
		'posts_per_page'      => 3,
		'ignore_sticky_posts' => true,
		'no_found_rows'       => true,
		'meta_query'          => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
			array(
				'key'     => '_haven_featured',
				'value'   => '1',
				'compare' => '=',
			),
		),
	)
);

// If nothing is flagged yet, fall back to the three newest listings so the
// section is never empty on a fresh install.
if ( ! $haven_featured->have_posts() ) {
	$haven_featured = new WP_Query(
		array(
			'post_type'           => 'property',
			'post_status'         => 'publish',
			'posts_per_page'      => 3,
			'ignore_sticky_posts' => true,
			'no_found_rows'       => true,
		)
	);
}

if ( ! $haven_featured->have_posts() ) {
	wp_reset_postdata();
	return;
}
?>

<section class="section section--featured">
	<div class="container">

		<header class="section__header">
			<div class="section__intro">
				<p class="eyebrow"><?php esc_html_e( 'Featured Properties', 'haven' ); ?></p>
				<h2 class="section__title"><?php esc_html_e( 'Handpicked Properties for You', 'haven' ); ?></h2>
				<p class="section__lede"><?php esc_html_e( 'Explore our curated selection of exceptional homes.', 'haven' ); ?></p>
			</div>

			<a class="link-arrow" href="<?php echo esc_url( haven_archive_url() ); ?>">
				<span><?php esc_html_e( 'View All Properties', 'haven' ); ?></span>
				<?php haven_the_icon( 'arrow-right', 'icon--gold' ); ?>
			</a>
		</header>

		<div class="card-grid">
			<?php
			while ( $haven_featured->have_posts() ) :
				$haven_featured->the_post();
				get_template_part( 'template-parts/card', 'property' );
			endwhile;
			?>
		</div>

	</div>
</section>

<?php wp_reset_postdata(); ?>

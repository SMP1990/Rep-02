<?php
/**
 * Similar residences — same property type, excluding the current listing.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

$haven_current = get_the_ID();
$haven_types   = wp_get_object_terms( $haven_current, 'property_type', array( 'fields' => 'ids' ) );

$haven_args = array(
	'post_type'           => 'property',
	'post_status'         => 'publish',
	'posts_per_page'      => 3,
	'post__not_in'        => array( $haven_current ),
	'ignore_sticky_posts' => true,
	'no_found_rows'       => true,
	'orderby'             => 'rand',
);

if ( $haven_types && ! is_wp_error( $haven_types ) ) {
	$haven_args['tax_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
		array(
			'taxonomy' => 'property_type',
			'field'    => 'term_id',
			'terms'    => $haven_types,
		),
	);
}

$haven_similar = new WP_Query( $haven_args );

// Fall back to any other listing rather than hiding the section entirely.
if ( ! $haven_similar->have_posts() ) {
	unset( $haven_args['tax_query'] );
	$haven_similar = new WP_Query( $haven_args );
}

if ( ! $haven_similar->have_posts() ) {
	wp_reset_postdata();
	return;
}
?>

<section class="similar">
	<header class="similar__head">
		<p class="eyebrow"><?php esc_html_e( 'Similar Residences', 'haven' ); ?></p>
		<h2 class="section__title"><?php esc_html_e( 'Recommended For You', 'haven' ); ?></h2>
	</header>

	<div class="card-grid">
		<?php
		while ( $haven_similar->have_posts() ) :
			$haven_similar->the_post();
			get_template_part( 'template-parts/card', 'property' );
		endwhile;
		?>
	</div>
</section>

<?php wp_reset_postdata(); ?>

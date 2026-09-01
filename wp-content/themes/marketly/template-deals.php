<?php
/**
 * Template Name: Deals
 *
 * Everything currently on sale, straight from WooCommerce's own on-sale
 * index, with real pagination.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

get_header();

$marketly_ids   = function_exists( 'wc_get_product_ids_on_sale' ) ? wc_get_product_ids_on_sale() : array();
$marketly_paged = max( 1, (int) get_query_var( 'paged' ) );
?>

<div class="container">
	<header class="page-header">
		<h1 class="page-title"><?php the_title(); ?></h1>
		<p class="page-header__desc">
			<?php
			printf(
				/* translators: %s: number of discounted products. */
				esc_html( _n( '%s product on offer right now.', '%s products on offer right now.', count( $marketly_ids ), 'marketly' ) ),
				esc_html( number_format_i18n( count( $marketly_ids ) ) )
			);
			?>
		</p>
	</header>

	<?php
	if ( ! $marketly_ids ) {
		get_template_part( 'template-parts/content', 'none' );
	} else {
		$marketly_query = new WP_Query(
			array(
				'post_type'      => 'product',
				'post_status'    => 'publish',
				'post__in'       => $marketly_ids,
				'posts_per_page' => 12,
				'paged'          => $marketly_paged,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'tax_query'      => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Catalogue visibility is a taxonomy in WooCommerce.
					array(
						'taxonomy' => 'product_visibility',
						'field'    => 'name',
						'terms'    => array( 'exclude-from-catalog' ),
						'operator' => 'NOT IN',
					),
				),
			)
		);
		?>

		<div class="grid pcols">
			<?php
			while ( $marketly_query->have_posts() ) :
				$marketly_query->the_post();
				$marketly_product = wc_get_product( get_the_ID() );

				if ( $marketly_product ) {
					get_template_part(
						'template-parts/card',
						'product',
						array(
							'product' => $marketly_product,
							'layout'  => 'v',
							'heading' => 'h2',
						)
					);
				}
			endwhile;
			?>
		</div>

		<?php
		// paginate_links() returns null when there is only one page, and
		// wp_kses_post() cannot be handed null.
		$marketly_links = paginate_links(
			array(
				'total'              => (int) $marketly_query->max_num_pages,
				'current'            => $marketly_paged,
				'mid_size'           => 1,
				'prev_text'          => esc_html__( 'Previous', 'marketly' ),
				'next_text'          => esc_html__( 'Next', 'marketly' ),
				'before_page_number' => '<span class="screen-reader-text">' . esc_html__( 'Page', 'marketly' ) . ' </span>',
				'type'               => 'list',
			)
		);

		if ( $marketly_links ) {
			echo '<nav class="pagination" aria-label="' . esc_attr__( 'Deals pagination', 'marketly' ) . '">';
			echo wp_kses_post( $marketly_links );
			echo '</nav>';
		}

		wp_reset_postdata();
	}
	?>
</div>

<?php
get_footer();

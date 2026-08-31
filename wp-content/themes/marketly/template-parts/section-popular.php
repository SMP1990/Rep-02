<?php
/**
 * Popular Categories — live categories with their real product counts.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_terms = marketly_get_product_categories( array( 'limit' => 4 ) );

if ( ! $marketly_terms ) {
	return;
}
?>
<section class="section" aria-labelledby="popular-title">
	<div class="container">
		<?php
		marketly_section_head(
			array(
				'title' => __( 'Popular Categories', 'marketly' ),
				'link'  => marketly_shop_url(),
				'id'    => 'popular-title',
			)
		);
		?>

		<div class="grid grid--2 grid--4">
			<?php foreach ( $marketly_terms as $marketly_term ) : ?>
				<?php get_template_part( 'template-parts/card', 'category', array( 'term' => $marketly_term ) ); ?>
			<?php endforeach; ?>
		</div>
	</div>
</section>

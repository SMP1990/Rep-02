<?php
/**
 * Why Choose Us — four framed feature columns.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

$haven_features = array(
	array(
		'icon'  => 'compass',
		'title' => __( 'Expert Guidance', 'haven' ),
		'body'  => __( 'Our experienced agents provide local knowledge and expert advice.', 'haven' ),
	),
	array(
		'icon'  => 'map-pin',
		'title' => __( 'Prime Locations', 'haven' ),
		'body'  => __( 'Access exclusive listings in the most desirable areas.', 'haven' ),
	),
	array(
		'icon'  => 'key',
		'title' => __( 'Seamless Process', 'haven' ),
		'body'  => __( 'We make buying, selling, or renting smooth and stress-free.', 'haven' ),
	),
	array(
		'icon'  => 'shield',
		'title' => __( 'Trusted by Clients', 'haven' ),
		'body'  => __( 'A track record of happy clients and successful deals.', 'haven' ),
	),
);
?>

<section class="section section--why">
	<div class="container">

		<header class="section__header section__header--wide">
			<div class="section__intro">
				<p class="eyebrow"><?php esc_html_e( 'Why Choose Us', 'haven' ); ?></p>
				<h2 class="section__title section__title--lg">
					<?php esc_html_e( 'We Make Real Estate', 'haven' ); ?>
					<span class="accent-italic"><?php esc_html_e( 'Simple & Rewarding', 'haven' ); ?></span>
				</h2>
				<p class="section__lede"><?php esc_html_e( 'From finding your dream home to closing the deal, we’re with you every step of the way.', 'haven' ); ?></p>
			</div>

			<a class="btn btn--dark" href="<?php echo esc_url( home_url( '/about/' ) ); ?>">
				<span><?php esc_html_e( 'Learn More About Us', 'haven' ); ?></span>
				<?php haven_the_icon( 'arrow-right', 'icon--gold' ); ?>
			</a>
		</header>

		<ul class="feature-grid">
			<?php foreach ( $haven_features as $haven_feature ) : ?>
				<li class="feature">
					<span class="feature__icon"><?php haven_the_icon( $haven_feature['icon'] ); ?></span>
					<h3 class="feature__title"><?php echo esc_html( $haven_feature['title'] ); ?></h3>
					<p class="feature__body"><?php echo esc_html( $haven_feature['body'] ); ?></p>
				</li>
			<?php endforeach; ?>
		</ul>

	</div>
</section>

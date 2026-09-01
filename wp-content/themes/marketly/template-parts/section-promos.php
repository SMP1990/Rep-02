<?php
/**
 * The two promotion banners.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_banners = array();

foreach ( array( 1, 2 ) as $marketly_n ) {
	$marketly_title = trim( (string) marketly_option( "promo{$marketly_n}_title" ) );

	if ( '' === $marketly_title ) {
		continue;
	}

	$marketly_banners[] = array(
		'title' => $marketly_title,
		'sub'   => trim( (string) marketly_option( "promo{$marketly_n}_sub" ) ),
		'note'  => trim( (string) marketly_option( "promo{$marketly_n}_note" ) ),
		'cta'   => trim( (string) marketly_option( "promo{$marketly_n}_cta" ) ),
		'url'   => (string) marketly_option( "promo{$marketly_n}_url" ),
		'image' => (int) marketly_option( "promo{$marketly_n}_image" ),
		'style' => (string) marketly_option( "promo{$marketly_n}_style" ),
	);
}

if ( ! $marketly_banners ) {
	return;
}

$marketly_heading = trim( (string) marketly_option( 'promo_heading' ) );
?>
<section class="section" <?php echo $marketly_heading ? 'aria-labelledby="promos-title"' : 'aria-label="' . esc_attr__( 'Promotions', 'marketly' ) . '"'; ?>>
	<div class="container">
		<?php
		if ( $marketly_heading ) {
			marketly_section_head(
				array(
					'title' => $marketly_heading,
					'id'    => 'promos-title',
				)
			);
		}
		?>

		<div class="promos">
			<?php foreach ( $marketly_banners as $marketly_banner ) : ?>
				<div class="promo promo--<?php echo esc_attr( $marketly_banner['style'] ); ?>">
					<div class="promo__body">
						<h3 class="promo__title"><?php echo esc_html( $marketly_banner['title'] ); ?></h3>

						<?php if ( $marketly_banner['sub'] ) : ?>
							<p class="promo__sub"><?php echo esc_html( $marketly_banner['sub'] ); ?></p>
						<?php endif; ?>

						<?php if ( $marketly_banner['note'] ) : ?>
							<p class="promo__note"><?php echo esc_html( $marketly_banner['note'] ); ?></p>
						<?php endif; ?>

						<?php if ( $marketly_banner['cta'] && $marketly_banner['url'] ) : ?>
							<a class="btn btn--sm promo__cta" href="<?php echo esc_url( $marketly_banner['url'] ); ?>">
								<?php echo esc_html( $marketly_banner['cta'] ); ?>
								<?php marketly_icon( 'arrow-right', array( 'size' => 15 ) ); ?>
							</a>
						<?php endif; ?>
					</div>

					<?php if ( $marketly_banner['image'] ) : ?>
						<div class="promo__media">
							<?php
							echo wp_get_attachment_image(
								$marketly_banner['image'],
								'marketly-banner',
								false,
								array(
									'class'   => 'promo__img',
									'loading' => 'lazy',
									'alt'     => '',
								)
							);
							?>
						</div>
					<?php endif; ?>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>

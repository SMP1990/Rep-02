<?php
/**
 * The hero banner.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

if ( ! marketly_option( 'hero_enable' ) ) {
	return;
}

$marketly_heading   = trim( (string) marketly_option( 'hero_heading' ) );
$marketly_highlight = trim( (string) marketly_option( 'hero_highlight' ) );

if ( '' === $marketly_heading && '' === $marketly_highlight ) {
	return;
}

$marketly_image = (int) marketly_option( 'hero_image' );
$marketly_cta1  = trim( (string) marketly_option( 'hero_cta1_text' ) );
$marketly_cta2  = trim( (string) marketly_option( 'hero_cta2_text' ) );
$marketly_url1  = marketly_option( 'hero_cta1_url' ) ? marketly_option( 'hero_cta1_url' ) : marketly_shop_url();
$marketly_url2  = marketly_option( 'hero_cta2_url' ) ? marketly_option( 'hero_cta2_url' ) : marketly_page_url( 'deals' );
$marketly_value = trim( (string) marketly_option( 'hero_badge_value' ) );

$marketly_trust = array();

foreach ( array( 1 => 'truck', 2 => 'refresh', 3 => 'shield' ) as $marketly_n => $marketly_icon_name ) {
	$marketly_title = trim( (string) marketly_option( "trust{$marketly_n}_title" ) );

	if ( '' !== $marketly_title ) {
		$marketly_trust[] = array(
			'icon'  => $marketly_icon_name,
			'title' => $marketly_title,
			'text'  => trim( (string) marketly_option( "trust{$marketly_n}_text" ) ),
		);
	}
}
?>
<section class="section hero" aria-labelledby="hero-title">
	<div class="container">
		<div class="hero__panel">
			<div class="hero__content">
				<?php if ( marketly_option( 'hero_eyebrow' ) ) : ?>
					<p class="hero__eyebrow"><?php echo esc_html( marketly_option( 'hero_eyebrow' ) ); ?></p>
				<?php endif; ?>

				<h1 class="hero__title" id="hero-title">
					<?php echo esc_html( $marketly_heading ); ?>
					<?php if ( $marketly_highlight ) : ?>
						<span class="hero__hl"><?php echo esc_html( $marketly_highlight ); ?></span>
					<?php endif; ?>
				</h1>

				<?php if ( marketly_option( 'hero_text' ) ) : ?>
					<p class="hero__text"><?php echo wp_kses_post( marketly_option( 'hero_text' ) ); ?></p>
				<?php endif; ?>

				<?php if ( $marketly_cta1 || $marketly_cta2 ) : ?>
					<p class="hero__actions">
						<?php if ( $marketly_cta1 && $marketly_url1 ) : ?>
							<a class="btn btn--lg" href="<?php echo esc_url( $marketly_url1 ); ?>">
								<?php echo esc_html( $marketly_cta1 ); ?>
								<?php marketly_icon( 'arrow-right', array( 'size' => 17 ) ); ?>
							</a>
						<?php endif; ?>

						<?php if ( $marketly_cta2 && $marketly_url2 ) : ?>
							<a class="btn btn--outline btn--lg" href="<?php echo esc_url( $marketly_url2 ); ?>">
								<?php echo esc_html( $marketly_cta2 ); ?>
							</a>
						<?php endif; ?>
					</p>
				<?php endif; ?>
			</div>

			<?php if ( $marketly_image ) : ?>
				<div class="hero__media">
					<?php
					// The hero is the largest thing above the fold, so it is
					// fetched at high priority and never lazy-loaded.
					echo wp_get_attachment_image(
						$marketly_image,
						'marketly-banner',
						false,
						array(
							'class'         => 'hero__img',
							'loading'       => 'eager',
							'fetchpriority' => 'high',
							'decoding'      => 'async',
							'alt'           => '',
						)
					);
					?>

					<?php if ( $marketly_value ) : ?>
						<span class="hero__badge" aria-hidden="true">
							<span class="hero__badge-top"><?php echo esc_html( marketly_option( 'hero_badge_top' ) ); ?></span>
							<span class="hero__badge-value"><?php echo esc_html( $marketly_value ); ?></span>
							<span class="hero__badge-low"><?php echo esc_html( marketly_option( 'hero_badge_low' ) ); ?></span>
						</span>
					<?php endif; ?>
				</div>
			<?php endif; ?>

			<?php if ( $marketly_trust ) : ?>
				<ul class="hero__trust">
					<?php foreach ( $marketly_trust as $marketly_item ) : ?>
						<li class="trust">
							<span class="trust__icon" aria-hidden="true">
								<?php marketly_icon( $marketly_item['icon'], array( 'size' => 18 ) ); ?>
							</span>
							<span class="trust__text">
								<strong class="trust__title"><?php echo esc_html( $marketly_item['title'] ); ?></strong>
								<?php if ( $marketly_item['text'] ) : ?>
									<span class="trust__sub"><?php echo esc_html( $marketly_item['text'] ); ?></span>
								<?php endif; ?>
							</span>
						</li>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>
		</div>
	</div>
</section>

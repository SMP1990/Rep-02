<?php
/**
 * About section — image with the floating video card, and three checkpoints.
 *
 * The video is a facade: nothing from YouTube or Vimeo loads until a visitor
 * presses play, which keeps a third-party player off the critical path.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

$haven_image_id  = (int) get_theme_mod( 'haven_about_image_id', 0 );
$haven_image_url = (string) get_theme_mod( 'haven_about_image_fallback', '' );
$haven_video     = (string) get_theme_mod( 'haven_about_video_url', '' );

$haven_points = array_filter(
	array(
		get_theme_mod( 'haven_about_point_1', '' ),
		get_theme_mod( 'haven_about_point_2', '' ),
		get_theme_mod( 'haven_about_point_3', '' ),
	)
);
?>

<section class="section section--about">
	<div class="container">
		<div class="about">

			<div class="about__media">
				<div class="about__frame">
					<?php
					if ( $haven_image_id ) {
						echo wp_get_attachment_image(
							$haven_image_id,
							'haven-gallery',
							false,
							array(
								'class' => 'about__image',
								'sizes' => '(max-width: 1024px) 92vw, 600px',
								'alt'   => '',
							)
						); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					} elseif ( $haven_image_url ) {
						printf(
							'<img class="about__image" src="%s" alt="" width="1200" height="800" loading="lazy" decoding="async">',
							esc_url( $haven_image_url )
						);
					}
					?>
					<span class="about__scrim" aria-hidden="true"></span>
				</div>

				<?php if ( $haven_video ) : ?>
					<div class="video-card">
						<button
							class="video-card__play"
							type="button"
							data-haven-video="<?php echo esc_url( $haven_video ); ?>"
							aria-label="<?php esc_attr_e( 'Play the Haven Realty film', 'haven' ); ?>"
						>
							<?php haven_the_icon( 'play' ); ?>
						</button>

						<span class="video-card__text">
							<span class="video-card__eyebrow"><?php esc_html_e( 'Watch Video', 'haven' ); ?></span>
							<span class="video-card__title"><?php esc_html_e( 'Discover the Haven Realty Difference', 'haven' ); ?></span>
						</span>
					</div>
				<?php endif; ?>
			</div>

			<div class="about__content">
				<p class="eyebrow"><?php echo esc_html( get_theme_mod( 'haven_about_eyebrow', '' ) ); ?></p>

				<h2 class="section__title section__title--lg">
					<?php echo esc_html( get_theme_mod( 'haven_about_title', '' ) ); ?>
					<span class="accent-italic"><?php echo esc_html( get_theme_mod( 'haven_about_title_accent', '' ) ); ?></span>
				</h2>

				<p class="about__body"><?php echo esc_html( get_theme_mod( 'haven_about_body', '' ) ); ?></p>

				<?php if ( $haven_points ) : ?>
					<ul class="checkpoints">
						<?php foreach ( $haven_points as $haven_point ) : ?>
							<li>
								<span class="checkpoints__mark"><?php haven_the_icon( 'check' ); ?></span>
								<span><?php echo esc_html( $haven_point ); ?></span>
							</li>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>
			</div>

		</div>
	</div>
</section>

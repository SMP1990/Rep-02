<?php
/**
 * Home hero — full-bleed image card with the floating search form.
 *
 * The form is a plain GET form pointing at the property archive, so pressing
 * Search produces a real, shareable, crawlable URL and works with JavaScript
 * turned off.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

$haven_hero_id       = (int) get_theme_mod( 'haven_hero_image_id', 0 );
$haven_hero_fallback = (string) get_theme_mod( 'haven_hero_image_fallback', '' );
$haven_eyebrow       = get_theme_mod( 'haven_hero_eyebrow', 'Find. Love. Live.' );
$haven_title         = get_theme_mod( 'haven_hero_title', 'Find a Home' );
$haven_accent        = get_theme_mod( 'haven_hero_title_accent', 'That Fits Your Lifestyle' );
$haven_subtitle      = get_theme_mod( 'haven_hero_subtitle', '' );
?>

<section class="hero">
	<div class="container">
		<div class="hero__card">

			<div class="hero__media">
				<?php
				if ( $haven_hero_id ) {
					echo wp_get_attachment_image(
						$haven_hero_id,
						'haven-hero',
						false,
						array(
							'class'         => 'hero__image',
							'sizes'         => '(max-width: 1280px) 100vw, 1280px',
							'fetchpriority' => 'high',
							'loading'       => 'eager',
							'decoding'      => 'async',
							'alt'           => '',
						)
					); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- core markup.
				} elseif ( $haven_hero_fallback ) {
					printf(
						'<img class="hero__image" src="%s" alt="" width="2000" height="1200" fetchpriority="high" decoding="async">',
						esc_url( $haven_hero_fallback )
					);
				}
				?>
				<span class="hero__scrim" aria-hidden="true"></span>
			</div>

			<div class="hero__content">
				<?php if ( $haven_eyebrow ) : ?>
					<p class="hero__eyebrow">
						<?php haven_the_icon( 'home', 'icon--gold' ); ?>
						<span><?php echo esc_html( $haven_eyebrow ); ?></span>
					</p>
				<?php endif; ?>

				<h1 class="hero__title">
					<?php echo esc_html( $haven_title ); ?>
					<?php if ( $haven_accent ) : ?>
						<span class="hero__title-accent"><?php echo esc_html( $haven_accent ); ?></span>
					<?php endif; ?>
				</h1>

				<?php if ( $haven_subtitle ) : ?>
					<p class="hero__subtitle"><?php echo esc_html( $haven_subtitle ); ?></p>
				<?php endif; ?>

				<p class="hero__actions">
					<a class="btn btn--dark btn--lg" href="<?php echo esc_url( haven_archive_url() ); ?>">
						<span><?php esc_html_e( 'Explore Properties', 'haven' ); ?></span>
						<?php haven_the_icon( 'arrow-right', 'icon--gold' ); ?>
					</a>
					<a class="btn btn--ghost btn--lg" href="<?php echo esc_url( home_url( '/about/' ) ); ?>">
						<?php esc_html_e( 'Learn More', 'haven' ); ?>
					</a>
				</p>
			</div>

			<form class="hero-search" action="<?php echo esc_url( haven_archive_url() ); ?>" method="get" role="search">
				<div class="hero-search__field">
					<label for="haven-location"><?php esc_html_e( 'Location', 'haven' ); ?></label>
					<span class="hero-search__control">
						<?php haven_the_icon( 'map-pin', 'icon--gold' ); ?>
						<?php haven_term_select( 'property_location', 'location', '', __( 'Any Location', 'haven' ) ); ?>
						<?php haven_the_icon( 'chevron-down', 'hero-search__chevron' ); ?>
					</span>
				</div>

				<div class="hero-search__field">
					<label for="haven-type"><?php esc_html_e( 'Property Type', 'haven' ); ?></label>
					<span class="hero-search__control">
						<?php haven_the_icon( 'home', 'icon--gold' ); ?>
						<?php haven_term_select( 'property_type', 'type', '', __( 'Any Type', 'haven' ) ); ?>
						<?php haven_the_icon( 'chevron-down', 'hero-search__chevron' ); ?>
					</span>
				</div>

				<div class="hero-search__field">
					<label for="haven-max_price"><?php esc_html_e( 'Price Range', 'haven' ); ?></label>
					<span class="hero-search__control">
						<?php haven_the_icon( 'dollar', 'icon--gold' ); ?>
						<select name="max_price" id="haven-max_price">
							<option value=""><?php esc_html_e( 'Any Price', 'haven' ); ?></option>
							<option value="2000000"><?php esc_html_e( 'Under 2M', 'haven' ); ?></option>
							<option value="5000000"><?php esc_html_e( 'Under 5M', 'haven' ); ?></option>
							<option value="10000000"><?php esc_html_e( 'Under 10M', 'haven' ); ?></option>
						</select>
						<?php haven_the_icon( 'chevron-down', 'hero-search__chevron' ); ?>
					</span>
				</div>

				<div class="hero-search__field">
					<label for="haven-beds"><?php esc_html_e( 'Bedrooms', 'haven' ); ?></label>
					<span class="hero-search__control">
						<?php haven_the_icon( 'bed', 'icon--gold' ); ?>
						<select name="beds" id="haven-beds">
							<option value=""><?php esc_html_e( 'Any', 'haven' ); ?></option>
							<?php foreach ( array( 2, 3, 4, 5 ) as $haven_bed ) : ?>
								<option value="<?php echo esc_attr( $haven_bed ); ?>">
									<?php
									printf(
										/* translators: %d: number of bedrooms */
										esc_html__( '%d+ Beds', 'haven' ),
										absint( $haven_bed )
									);
									?>
								</option>
							<?php endforeach; ?>
						</select>
						<?php haven_the_icon( 'chevron-down', 'hero-search__chevron' ); ?>
					</span>
				</div>

				<div class="hero-search__submit">
					<button class="btn btn--dark btn--block" type="submit">
						<?php haven_the_icon( 'search', 'icon--gold' ); ?>
						<span><?php esc_html_e( 'Search Properties', 'haven' ); ?></span>
					</button>
				</div>
			</form>

		</div>
	</div>
</section>

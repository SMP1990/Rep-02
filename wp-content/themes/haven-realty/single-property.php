<?php
/**
 * Single property.
 *
 * The former modal, now a real indexable page at /properties/{slug}/ with its
 * own title, canonical, Open Graph card and RealEstateListing structured data.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();

	$haven_id       = get_the_ID();
	$haven_gallery  = haven_get_gallery_ids( $haven_id );
	$haven_agent    = haven_get_agent( $haven_id );
	$haven_status   = haven_field( 'availability', $haven_id );
	$haven_per_sqft = haven_price_per_sqft( $haven_id );
	$haven_video    = haven_field( 'video_url', $haven_id );
	?>

	<article class="property">
		<div class="container">

			<?php haven_breadcrumbs(); ?>

			<?php if ( $haven_gallery ) : ?>
				<section class="gallery" data-haven-gallery-viewer>
					<div class="gallery__stage">
						<?php foreach ( $haven_gallery as $haven_index => $haven_image_id ) : ?>
							<figure class="gallery__slide <?php echo 0 === $haven_index ? 'is-active' : ''; ?>" data-index="<?php echo esc_attr( $haven_index ); ?>">
								<?php
								echo wp_get_attachment_image(
									$haven_image_id,
									'haven-gallery',
									false,
									array(
										'class'         => 'gallery__image',
										'sizes'         => '(max-width: 1280px) 100vw, 1280px',
										'alt'           => get_the_title(),
										'loading'       => 0 === $haven_index ? 'eager' : 'lazy',
										'fetchpriority' => 0 === $haven_index ? 'high' : 'auto',
										'decoding'      => 'async',
									)
								); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
								?>
							</figure>
						<?php endforeach; ?>

						<div class="gallery__badges">
							<span class="pill pill--light"><?php echo esc_html( haven_purpose_label( $haven_id ) ); ?></span>
							<?php if ( haven_first_term( 'property_type', $haven_id ) ) : ?>
								<span class="pill pill--dark"><?php echo esc_html( haven_first_term( 'property_type', $haven_id ) ); ?></span>
							<?php endif; ?>
							<?php if ( $haven_status && 'active' !== $haven_status ) : ?>
								<span class="pill pill--muted"><?php echo esc_html( haven_availability_label( $haven_id ) ); ?></span>
							<?php endif; ?>
						</div>

						<?php if ( count( $haven_gallery ) > 1 ) : ?>
							<button class="gallery__nav gallery__nav--prev" type="button" data-haven-gallery-prev aria-label="<?php esc_attr_e( 'Previous image', 'haven' ); ?>">
								<?php haven_the_icon( 'chevron-left' ); ?>
							</button>
							<button class="gallery__nav gallery__nav--next" type="button" data-haven-gallery-next aria-label="<?php esc_attr_e( 'Next image', 'haven' ); ?>">
								<?php haven_the_icon( 'chevron-right' ); ?>
							</button>

							<p class="gallery__counter">
								<span data-haven-gallery-current>1</span>&thinsp;/&thinsp;<?php echo esc_html( count( $haven_gallery ) ); ?>
							</p>
						<?php endif; ?>
					</div>

					<?php if ( count( $haven_gallery ) > 1 ) : ?>
						<div class="gallery__thumbs">
							<?php foreach ( $haven_gallery as $haven_index => $haven_image_id ) : ?>
								<button
									class="gallery__thumb <?php echo 0 === $haven_index ? 'is-active' : ''; ?>"
									type="button"
									data-haven-gallery-thumb="<?php echo esc_attr( $haven_index ); ?>"
									aria-label="<?php
									printf(
										/* translators: %d: image number */
										esc_attr__( 'Show image %d', 'haven' ),
										absint( $haven_index + 1 )
									);
									?>"
								>
									<?php
									echo wp_get_attachment_image(
										$haven_image_id,
										'haven-thumb',
										false,
										array( 'alt' => '' )
									); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
									?>
								</button>
							<?php endforeach; ?>
						</div>
					<?php endif; ?>
				</section>
			<?php endif; ?>

			<header class="property__header">
				<div class="property__identity">
					<p class="eyebrow eyebrow--verified">
						<span><?php esc_html_e( 'Verified Haven Listing', 'haven' ); ?></span>
						<?php haven_the_icon( 'shield', 'icon--gold' ); ?>
					</p>

					<h1 class="property__title"><?php the_title(); ?></h1>

					<?php $haven_address = haven_get_full_address( $haven_id ) ? haven_get_full_address( $haven_id ) : haven_get_location( $haven_id ); ?>
					<?php if ( $haven_address ) : ?>
						<p class="property__address">
							<?php haven_the_icon( 'map-pin', 'icon--gold' ); ?>
							<span><?php echo esc_html( $haven_address ); ?></span>
						</p>
					<?php endif; ?>
				</div>

				<div class="property__pricing">
					<p class="property__price-label"><?php esc_html_e( 'Offered At', 'haven' ); ?></p>
					<p class="property__price"><?php echo esc_html( haven_get_price_display( $haven_id ) ); ?></p>

					<?php if ( $haven_per_sqft ) : ?>
						<p class="property__per-sqft">
							<?php
							printf(
								/* translators: %s: formatted price per square foot */
								esc_html__( 'Approx. %s / sq ft', 'haven' ),
								esc_html( $haven_per_sqft )
							);
							?>
						</p>
					<?php endif; ?>

					<p class="property__header-tools">
						<button class="icon-btn icon-btn--solid" type="button" data-haven-share data-url="<?php the_permalink(); ?>" aria-label="<?php esc_attr_e( 'Copy link to this property', 'haven' ); ?>">
							<?php haven_the_icon( 'share' ); ?>
						</button>
						<button class="icon-btn icon-btn--solid icon-btn--fav" type="button" data-haven-fav="<?php echo esc_attr( $haven_id ); ?>" aria-pressed="false" aria-label="<?php esc_attr_e( 'Save to favorites', 'haven' ); ?>">
							<?php haven_the_icon( 'heart' ); ?>
						</button>
					</p>
				</div>
			</header>

			<?php
			$haven_specs = array_filter(
				array(
					array( 'bed', haven_field( 'bedrooms', $haven_id ), __( 'Bedrooms', 'haven' ) ),
					array( 'bath', haven_field( 'bathrooms', $haven_id ), __( 'Bathrooms', 'haven' ) ),
					array( 'area', haven_field( 'area_sqft', $haven_id ) ? number_format_i18n( (float) haven_field( 'area_sqft', $haven_id ) ) : '', __( 'Sq Ft Area', 'haven' ) ),
					array( 'calendar', haven_field( 'year_built', $haven_id ), __( 'Year Built', 'haven' ) ),
					array( 'building', haven_first_term( 'property_type', $haven_id ), __( 'Type', 'haven' ) ),
					array( 'clock', haven_field( 'garage', $haven_id ), __( 'Garage', 'haven' ) ),
				),
				static function ( $spec ) {
					return '' !== $spec[1] && null !== $spec[1];
				}
			);
			?>

			<?php if ( $haven_specs ) : ?>
				<ul class="spec-grid">
					<?php foreach ( $haven_specs as $haven_spec ) : ?>
						<li class="spec">
							<?php haven_the_icon( $haven_spec[0], 'icon--gold' ); ?>
							<span class="spec__value"><?php echo esc_html( $haven_spec[1] ); ?></span>
							<span class="spec__label"><?php echo esc_html( $haven_spec[2] ); ?></span>
						</li>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>

			<div class="property__layout">

				<div class="property__main">

					<?php if ( get_the_content() ) : ?>
						<section class="prose">
							<h2><?php esc_html_e( 'About This Property', 'haven' ); ?></h2>
							<?php the_content(); ?>
						</section>
					<?php endif; ?>

					<?php
					$haven_amenities = get_the_terms( $haven_id, 'property_amenity' );

					if ( $haven_amenities && ! is_wp_error( $haven_amenities ) ) :
						?>
						<section class="amenities">
							<h2><?php esc_html_e( 'Luxury Amenities & Features', 'haven' ); ?></h2>
							<ul class="amenities__list">
								<?php foreach ( $haven_amenities as $haven_amenity ) : ?>
									<li class="amenity">
										<span class="amenity__mark"><?php haven_the_icon( 'check' ); ?></span>
										<a href="<?php echo esc_url( (string) get_term_link( $haven_amenity ) ); ?>"><?php echo esc_html( $haven_amenity->name ); ?></a>
									</li>
								<?php endforeach; ?>
							</ul>
						</section>
					<?php endif; ?>

					<?php if ( $haven_video ) : ?>
						<section class="property__video">
							<h2><?php esc_html_e( 'Property Film', 'haven' ); ?></h2>
							<button class="video-facade" type="button" data-haven-video="<?php echo esc_url( $haven_video ); ?>">
								<span class="video-facade__play"><?php haven_the_icon( 'play' ); ?></span>
								<span class="video-facade__label"><?php esc_html_e( 'Play the property film', 'haven' ); ?></span>
							</button>
						</section>
					<?php endif; ?>

					<?php
					get_template_part(
						'template-parts/mortgage',
						null,
						array(
							'price' => (float) haven_field( 'price', $haven_id ),
						)
					);
					?>

				</div>

				<aside class="property__aside">

					<div class="agent-card">
						<div class="agent-card__head">
							<?php if ( $haven_agent['photo_id'] ) : ?>
								<?php
								echo wp_get_attachment_image(
									$haven_agent['photo_id'],
									'thumbnail',
									false,
									array(
										'class' => 'agent-card__photo',
										'alt'   => $haven_agent['name'],
									)
								); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
								?>
							<?php else : ?>
								<span class="agent-card__photo agent-card__photo--initial" aria-hidden="true"><?php echo esc_html( mb_substr( $haven_agent['name'], 0, 1 ) ); ?></span>
							<?php endif; ?>

							<div>
								<p class="agent-card__eyebrow"><?php esc_html_e( 'Listing Representative', 'haven' ); ?></p>
								<p class="agent-card__name"><?php echo esc_html( $haven_agent['name'] ); ?></p>
								<?php if ( $haven_agent['email'] ) : ?>
									<p class="agent-card__email"><?php echo esc_html( $haven_agent['email'] ); ?></p>
								<?php endif; ?>
							</div>
						</div>

						<div class="agent-card__foot">
							<?php if ( $haven_agent['phone'] ) : ?>
								<a href="tel:<?php echo esc_attr( preg_replace( '/[^0-9+]/', '', $haven_agent['phone'] ) ); ?>">
									<?php haven_the_icon( 'phone', 'icon--gold' ); ?>
									<span><?php echo esc_html( $haven_agent['phone'] ); ?></span>
								</a>
							<?php endif; ?>

							<span class="agent-card__verified">
								<?php haven_the_icon( 'user-check', 'icon--gold' ); ?>
								<span><?php esc_html_e( 'Verified Advisor', 'haven' ); ?></span>
							</span>
						</div>
					</div>

					<?php get_template_part( 'template-parts/form', 'inquiry' ); ?>

				</aside>

			</div>

			<?php get_template_part( 'template-parts/similar', 'properties' ); ?>

		</div>
	</article>

	<?php
endwhile;

get_footer();

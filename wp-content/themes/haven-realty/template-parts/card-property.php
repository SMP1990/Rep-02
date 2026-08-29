<?php
/**
 * Property card.
 *
 * One template used by the home page, the catalog, the saved page and the
 * "similar residences" strip — including when the favorites REST endpoint
 * renders it, so there is no duplicate card markup in JavaScript.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

$haven_id       = get_the_ID();
$haven_location = haven_get_location( $haven_id );
$haven_beds     = haven_field( 'bedrooms', $haven_id );
$haven_baths    = haven_field( 'bathrooms', $haven_id );
$haven_area     = haven_field( 'area_sqft', $haven_id );
$haven_type     = haven_first_term( 'property_type', $haven_id );
$haven_status   = haven_field( 'availability', $haven_id );
?>

<article class="card" id="property-<?php echo esc_attr( $haven_id ); ?>">

	<div class="card__media">
		<a class="card__media-link" href="<?php the_permalink(); ?>" tabindex="-1" aria-hidden="true">
			<?php
			if ( has_post_thumbnail() ) {
				the_post_thumbnail(
					'haven-card',
					array(
						'class' => 'card__image',
						'sizes' => '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 400px',
						'alt'   => get_the_title(),
					)
				);
			} else {
				echo '<span class="card__image card__image--placeholder" aria-hidden="true"></span>';
			}
			?>
		</a>

		<span class="card__scrim" aria-hidden="true"></span>

		<div class="card__badges">
			<span class="pill pill--light"><?php echo esc_html( haven_purpose_label( $haven_id ) ); ?></span>

			<?php if ( haven_field( 'featured', $haven_id ) ) : ?>
				<span class="pill pill--dark">
					<?php haven_the_icon( 'sparkles', 'icon--gold' ); ?>
					<span><?php esc_html_e( 'Featured', 'haven' ); ?></span>
				</span>
			<?php endif; ?>

			<?php if ( $haven_status && 'active' !== $haven_status ) : ?>
				<span class="pill pill--muted"><?php echo esc_html( haven_availability_label( $haven_id ) ); ?></span>
			<?php endif; ?>
		</div>

		<div class="card__tools">
			<button
				class="icon-btn"
				type="button"
				data-haven-share
				data-url="<?php the_permalink(); ?>"
				aria-label="<?php esc_attr_e( 'Copy link to this property', 'haven' ); ?>"
			>
				<?php haven_the_icon( 'share' ); ?>
			</button>

			<button
				class="icon-btn icon-btn--fav"
				type="button"
				data-haven-fav="<?php echo esc_attr( $haven_id ); ?>"
				aria-pressed="false"
				aria-label="<?php esc_attr_e( 'Save to favorites', 'haven' ); ?>"
			>
				<?php haven_the_icon( 'heart' ); ?>
			</button>
		</div>

		<?php if ( $haven_type ) : ?>
			<span class="card__type"><?php echo esc_html( $haven_type ); ?></span>
		<?php endif; ?>
	</div>

	<div class="card__body">
		<h3 class="card__title">
			<a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
		</h3>

		<?php if ( $haven_location ) : ?>
			<p class="card__location">
				<?php haven_the_icon( 'map-pin', 'icon--gold' ); ?>
				<span><?php echo esc_html( $haven_location ); ?></span>
			</p>
		<?php endif; ?>

		<ul class="card__specs">
			<?php if ( '' !== $haven_beds ) : ?>
				<li>
					<?php haven_the_icon( 'bed' ); ?>
					<span>
						<?php
						printf(
							/* translators: %s: number of bedrooms */
							esc_html__( '%s Beds', 'haven' ),
							esc_html( $haven_beds )
						);
						?>
					</span>
				</li>
			<?php endif; ?>

			<?php if ( '' !== $haven_baths ) : ?>
				<li>
					<?php haven_the_icon( 'bath' ); ?>
					<span>
						<?php
						printf(
							/* translators: %s: number of bathrooms */
							esc_html__( '%s Baths', 'haven' ),
							esc_html( $haven_baths )
						);
						?>
					</span>
				</li>
			<?php endif; ?>

			<?php if ( '' !== $haven_area ) : ?>
				<li>
					<?php haven_the_icon( 'area' ); ?>
					<span>
						<?php
						printf(
							/* translators: %s: floor area */
							esc_html__( '%s Sq Ft', 'haven' ),
							esc_html( number_format_i18n( (float) $haven_area ) )
						);
						?>
					</span>
				</li>
			<?php endif; ?>
		</ul>

		<p class="card__footer">
			<span class="card__price"><?php echo esc_html( haven_get_price_display( $haven_id ) ); ?></span>
			<a class="card__cta" href="<?php the_permalink(); ?>">
				<span><?php esc_html_e( 'View Details', 'haven' ); ?></span>
				<?php haven_the_icon( 'arrow-right' ); ?>
			</a>
		</p>
	</div>

</article>

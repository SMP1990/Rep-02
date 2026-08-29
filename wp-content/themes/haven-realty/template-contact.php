<?php
/**
 * Template Name: Contact & Consultation
 *
 * The advisory consultation form from the original modal, now a real page with
 * its own URL so it can be linked from ads, email and search results.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

get_header();

$haven_phone   = get_theme_mod( 'haven_contact_phone', '' );
$haven_email   = get_theme_mod( 'haven_contact_email', get_option( 'admin_email' ) );
$haven_address = get_theme_mod( 'haven_contact_address', '' );
?>

<div class="page-single">

	<header class="page-hero">
		<div class="container">
			<p class="eyebrow eyebrow--light"><?php esc_html_e( 'Private Advisory', 'haven' ); ?></p>
			<h1 class="page-hero__title"><?php the_title(); ?></h1>
			<p class="page-hero__lede">
				<?php esc_html_e( 'Tell us what you are looking for and a senior Haven advisor will be in touch within one business day.', 'haven' ); ?>
			</p>
		</div>
	</header>

	<div class="container">
		<div class="contact-layout">

			<div class="contact-form-wrap">
				<?php
				while ( have_posts() ) :
					the_post();

					if ( get_the_content() ) :
						?>
						<div class="prose"><?php the_content(); ?></div>
						<?php
					endif;
				endwhile;
				?>

				<form class="consultation" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
					<input type="hidden" name="action" value="haven_consultation">
					<input type="hidden" name="source_url" value="<?php echo esc_url( haven_canonical_url() ); ?>">
					<?php wp_nonce_field( 'haven_consultation', 'haven_nonce' ); ?>

					<p class="honeypot" aria-hidden="true">
						<label for="haven-website-consult"><?php esc_html_e( 'Leave this field empty', 'haven' ); ?></label>
						<input type="text" id="haven-website-consult" name="haven_website" tabindex="-1" autocomplete="off">
					</p>

					<div class="field-row">
						<p class="field">
							<label for="haven-consult-name"><?php esc_html_e( 'Full Name', 'haven' ); ?> <span class="required">*</span></label>
							<input type="text" id="haven-consult-name" name="name" required autocomplete="name">
						</p>

						<p class="field">
							<label for="haven-consult-email"><?php esc_html_e( 'Email', 'haven' ); ?> <span class="required">*</span></label>
							<input type="email" id="haven-consult-email" name="email" required autocomplete="email">
						</p>
					</div>

					<div class="field-row">
						<p class="field">
							<label for="haven-consult-phone"><?php esc_html_e( 'Phone', 'haven' ); ?></label>
							<input type="tel" id="haven-consult-phone" name="phone" autocomplete="tel">
						</p>

						<p class="field">
							<label for="haven-consult-service"><?php esc_html_e( 'How can we help?', 'haven' ); ?></label>
							<select id="haven-consult-service" name="service_type">
								<?php
								$haven_services = array( 'Buying', 'Selling', 'Property Valuation', 'Investment Advisory', 'Relocation' );

								foreach ( $haven_services as $haven_service ) {
									printf(
										'<option value="%1$s">%2$s</option>',
										esc_attr( $haven_service ),
										esc_html( $haven_service )
									);
								}
								?>
							</select>
						</p>
					</div>

					<div class="field-row">
						<p class="field">
							<label for="haven-consult-date"><?php esc_html_e( 'Preferred Date', 'haven' ); ?></label>
							<input type="date" id="haven-consult-date" name="preferred_date" min="<?php echo esc_attr( gmdate( 'Y-m-d' ) ); ?>">
						</p>

						<p class="field">
							<label for="haven-consult-time"><?php esc_html_e( 'Preferred Time', 'haven' ); ?></label>
							<select id="haven-consult-time" name="preferred_time">
								<option value="Morning (9 AM – 12 PM)"><?php esc_html_e( 'Morning (9 AM – 12 PM)', 'haven' ); ?></option>
								<option value="Afternoon (12 – 5 PM)"><?php esc_html_e( 'Afternoon (12 – 5 PM)', 'haven' ); ?></option>
								<option value="Evening (5 – 8 PM)"><?php esc_html_e( 'Evening (5 – 8 PM)', 'haven' ); ?></option>
							</select>
						</p>
					</div>

					<p class="field">
						<label for="haven-consult-notes"><?php esc_html_e( 'Notes', 'haven' ); ?></label>
						<textarea id="haven-consult-notes" name="notes" rows="5" placeholder="<?php esc_attr_e( 'Budget, preferred neighbourhoods, timeline…', 'haven' ); ?>"></textarea>
					</p>

					<button class="btn btn--dark btn--lg" type="submit">
						<?php haven_the_icon( 'send', 'icon--gold' ); ?>
						<span><?php esc_html_e( 'Request Consultation', 'haven' ); ?></span>
					</button>
				</form>
			</div>

			<aside class="contact-aside">
				<div class="contact-card">
					<h2 class="contact-card__title"><?php esc_html_e( 'Speak to Us Directly', 'haven' ); ?></h2>

					<ul class="contact-card__list">
						<?php if ( $haven_phone ) : ?>
							<li>
								<?php haven_the_icon( 'phone', 'icon--gold' ); ?>
								<a href="tel:<?php echo esc_attr( preg_replace( '/[^0-9+]/', '', $haven_phone ) ); ?>"><?php echo esc_html( $haven_phone ); ?></a>
							</li>
						<?php endif; ?>

						<?php if ( $haven_email ) : ?>
							<li>
								<?php haven_the_icon( 'mail', 'icon--gold' ); ?>
								<a href="mailto:<?php echo esc_attr( $haven_email ); ?>"><?php echo esc_html( $haven_email ); ?></a>
							</li>
						<?php endif; ?>

						<?php if ( $haven_address ) : ?>
							<li>
								<?php haven_the_icon( 'map-pin', 'icon--gold' ); ?>
								<span><?php echo esc_html( $haven_address ); ?></span>
							</li>
						<?php endif; ?>
					</ul>
				</div>

				<div class="contact-card contact-card--dark">
					<h2 class="contact-card__title"><?php esc_html_e( 'Prefer to Browse First?', 'haven' ); ?></h2>
					<p><?php esc_html_e( 'The full portfolio is open — filter by location, type, price and amenities.', 'haven' ); ?></p>
					<a class="btn btn--gold" href="<?php echo esc_url( haven_archive_url() ); ?>">
						<?php esc_html_e( 'View Properties', 'haven' ); ?>
					</a>
				</div>
			</aside>

		</div>
	</div>

</div>

<?php
get_footer();

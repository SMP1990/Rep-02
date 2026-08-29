<?php
/**
 * Property inquiry & tour request form.
 *
 * Plain POST to admin-post.php: no AJAX, no JavaScript required, nonce and
 * honeypot protected, and the result comes back as a redirect with a status
 * flag the header renders as a notice.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

$haven_property_id = get_the_ID();
?>

<div class="inquiry" id="inquire">

	<div class="inquiry__intro">
		<h2 class="inquiry__title"><?php esc_html_e( 'Inquire & Schedule Tour', 'haven' ); ?></h2>
		<p class="inquiry__lede"><?php esc_html_e( 'Your request goes directly to the listing representative.', 'haven' ); ?></p>
	</div>

	<form class="inquiry__form" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
		<input type="hidden" name="action" value="haven_inquiry">
		<input type="hidden" name="property_id" value="<?php echo esc_attr( $haven_property_id ); ?>">
		<?php wp_nonce_field( 'haven_inquiry', 'haven_nonce' ); ?>

		<p class="honeypot" aria-hidden="true">
			<label for="haven-website-inquiry"><?php esc_html_e( 'Leave this field empty', 'haven' ); ?></label>
			<input type="text" id="haven-website-inquiry" name="haven_website" tabindex="-1" autocomplete="off">
		</p>

		<fieldset class="tour-type">
			<legend class="screen-reader-text"><?php esc_html_e( 'Type of visit', 'haven' ); ?></legend>

			<label class="tour-type__option">
				<input type="radio" name="tour_type" value="in_person" checked>
				<span><?php esc_html_e( 'In-Person', 'haven' ); ?></span>
			</label>

			<label class="tour-type__option">
				<input type="radio" name="tour_type" value="video_call">
				<span><?php esc_html_e( 'Live Video', 'haven' ); ?></span>
			</label>

			<label class="tour-type__option">
				<input type="radio" name="tour_type" value="general_inquiry">
				<span><?php esc_html_e( 'Inquiry', 'haven' ); ?></span>
			</label>
		</fieldset>

		<p class="field">
			<label for="haven-tour-date"><?php esc_html_e( 'Preferred Viewing Date', 'haven' ); ?></label>
			<input type="date" id="haven-tour-date" name="tour_date" min="<?php echo esc_attr( gmdate( 'Y-m-d' ) ); ?>">
		</p>

		<div class="field-row">
			<p class="field">
				<label for="haven-inquiry-name"><?php esc_html_e( 'Your Name', 'haven' ); ?> <span class="required">*</span></label>
				<input type="text" id="haven-inquiry-name" name="name" required autocomplete="name">
			</p>

			<p class="field">
				<label for="haven-inquiry-email"><?php esc_html_e( 'Your Email', 'haven' ); ?> <span class="required">*</span></label>
				<input type="email" id="haven-inquiry-email" name="email" required autocomplete="email">
			</p>
		</div>

		<p class="field">
			<label for="haven-inquiry-phone"><?php esc_html_e( 'Phone Number', 'haven' ); ?></label>
			<input type="tel" id="haven-inquiry-phone" name="phone" autocomplete="tel">
		</p>

		<p class="field">
			<label for="haven-inquiry-message"><?php esc_html_e( 'Your Message', 'haven' ); ?> <span class="required">*</span></label>
			<textarea id="haven-inquiry-message" name="message" rows="4" required><?php
				echo esc_textarea(
					sprintf(
						/* translators: %s: property title */
						__( 'I would like to arrange a viewing of %s.', 'haven' ),
						get_the_title( $haven_property_id )
					)
				);
			?></textarea>
		</p>

		<button class="btn btn--dark btn--block" type="submit">
			<?php haven_the_icon( 'send', 'icon--gold' ); ?>
			<span><?php esc_html_e( 'Send Inquiry', 'haven' ); ?></span>
		</button>

		<p class="inquiry__privacy">
			<?php esc_html_e( 'Your details are used only to answer this inquiry.', 'haven' ); ?>
		</p>
	</form>

</div>

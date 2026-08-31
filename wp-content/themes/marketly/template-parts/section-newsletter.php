<?php
/**
 * The newsletter signup.
 *
 * Posts to admin-post.php so the handler lives in the plugin and the response
 * is a redirect — a refresh never resubmits. Nonce, honeypot and per-IP
 * throttling are all enforced server-side in Marketly_Forms.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

if ( ! marketly_option( 'news_enable' ) || ! marketly_core_active() ) {
	return;
}

$marketly_status = Marketly_Forms::newsletter_status();

$marketly_messages = array(
	'ok'      => array( 'ok', __( 'Thanks — you’re on the list.', 'marketly' ) ),
	'invalid' => array( 'error', __( 'That email address doesn’t look right. Please check it and try again.', 'marketly' ) ),
	'slow'    => array( 'error', __( 'You just submitted the form. Please wait a moment before trying again.', 'marketly' ) ),
	'error'   => array( 'error', __( 'Something went wrong. Please try again.', 'marketly' ) ),
);
?>
<section class="section newsletter" id="marketly-newsletter" aria-labelledby="newsletter-title">
	<div class="container">
		<div class="newsletter__panel">
			<span class="newsletter__icon" aria-hidden="true">
				<?php marketly_icon( 'mail', array( 'size' => 22 ) ); ?>
			</span>

			<div class="newsletter__text">
				<h2 class="newsletter__title" id="newsletter-title">
					<?php echo esc_html( marketly_option( 'news_title' ) ); ?>
				</h2>

				<?php if ( marketly_option( 'news_text' ) ) : ?>
					<p class="newsletter__sub"><?php echo wp_kses_post( marketly_option( 'news_text' ) ); ?></p>
				<?php endif; ?>
			</div>

			<form class="newsletter__form" method="post"
				action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">

				<input type="hidden" name="action" value="marketly_newsletter">
				<input type="hidden" name="marketly_source" value="<?php echo esc_url( home_url( add_query_arg( array() ) ) ); ?>">
				<?php wp_nonce_field( 'marketly_newsletter', 'marketly_nonce' ); ?>

				<label class="screen-reader-text" for="marketly-email">
					<?php esc_html_e( 'Your email address', 'marketly' ); ?>
				</label>

				<input type="email" id="marketly-email" name="marketly_email" required
					autocomplete="email" spellcheck="false"
					placeholder="<?php esc_attr_e( 'Enter your email address', 'marketly' ); ?>">

				<?php // Hidden from people, irresistible to naive bots. ?>
				<p class="field field--trap" aria-hidden="true">
					<label for="marketly-website"><?php esc_html_e( 'Leave this field empty', 'marketly' ); ?></label>
					<input type="text" id="marketly-website" name="marketly_website" tabindex="-1" autocomplete="off">
				</p>

				<button type="submit" class="btn"><?php esc_html_e( 'Subscribe', 'marketly' ); ?></button>
			</form>

			<?php if ( $marketly_status && isset( $marketly_messages[ $marketly_status ] ) ) : ?>
				<p class="notice-inline notice-inline--<?php echo esc_attr( $marketly_messages[ $marketly_status ][0] ); ?> newsletter__notice"
					role="status">
					<?php echo esc_html( $marketly_messages[ $marketly_status ][1] ); ?>
				</p>
			<?php endif; ?>
		</div>
	</div>
</section>

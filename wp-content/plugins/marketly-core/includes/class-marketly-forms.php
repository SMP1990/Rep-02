<?php
/**
 * Front-end form handling.
 *
 * Every submission passes the same four gates before anything is written:
 * a nonce (CSRF), a honeypot (naive bots), a per-IP cool-off (flooding) and
 * per-field sanitising. The response is always a redirect back to the page
 * the form was on, so a refresh never resubmits.
 *
 * @package Marketly_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles the newsletter form.
 */
class Marketly_Forms {

	const ACTION = 'marketly_newsletter';

	/**
	 * Hook the handler for both logged-in and logged-out visitors.
	 */
	public static function init() {
		add_action( 'admin_post_' . self::ACTION, array( __CLASS__, 'handle_newsletter' ) );
		add_action( 'admin_post_nopriv_' . self::ACTION, array( __CLASS__, 'handle_newsletter' ) );
	}

	/**
	 * Process a newsletter signup.
	 */
	public static function handle_newsletter() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- Verified immediately below.
		$nonce = isset( $_POST['marketly_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['marketly_nonce'] ) ) : '';

		if ( ! wp_verify_nonce( $nonce, self::ACTION ) ) {
			self::redirect( 'error' );
		}

		$post = wp_unslash( $_POST );
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		// A bot that fills every field it finds gets a success response and is
		// written nowhere. Telling it apart would only help it adapt.
		if ( marketly_core_is_bot( $post ) ) {
			self::redirect( 'ok' );
		}

		if ( marketly_core_is_throttled( self::ACTION, 30 ) ) {
			self::redirect( 'slow' );
		}

		$raw   = isset( $post['marketly_email'] ) ? trim( (string) $post['marketly_email'] ) : '';
		$email = sanitize_email( $raw );

		// Reject anything sanitising had to alter, rather than storing the
		// remains. "<script>alert(1)</script>@x.test" survives sanitising as
		// "scriptalert1/script@x.test", which is RFC-valid and would be
		// accepted silently — a junk record, and a confusing outcome for
		// someone who simply mistyped.
		if ( '' === $email || $email !== $raw || ! is_email( $email ) ) {
			self::redirect( 'invalid' );
		}

		if ( Marketly_Subscribers::exists( $email ) ) {
			// Already subscribed reads as success — confirming or denying that
			// an address is on the list would leak it to anyone who asks.
			self::redirect( 'ok' );
		}

		$source = isset( $post['marketly_source'] ) ? esc_url_raw( (string) $post['marketly_source'] ) : '';
		$result = Marketly_Subscribers::add( $email, $source );

		if ( is_wp_error( $result ) ) {
			self::redirect( 'error' );
		}

		/**
		 * Fires after a subscriber is stored.
		 *
		 * @param string $email Subscriber email.
		 * @param int    $id    Subscriber post ID.
		 */
		do_action( 'marketly_subscriber_added', $email, (int) $result );

		self::redirect( 'ok' );
	}

	/**
	 * Redirect back to the submitting page with a status flag.
	 *
	 * Off-site hosts are refused by wp_safe_redirect(), so a forged
	 * _wp_http_referer cannot bounce a visitor somewhere else.
	 *
	 * @param string $status Status slug.
	 */
	private static function redirect( $status ) {
		$referer = wp_get_referer();
		$target  = $referer ? $referer : home_url( '/' );

		$target = remove_query_arg( array( 'marketly_news' ), $target );
		$target = add_query_arg( 'marketly_news', rawurlencode( $status ), $target );

		wp_safe_redirect( $target . '#marketly-newsletter', 302 );
		exit;
	}

	/**
	 * The status of the newsletter form on this request, if any.
	 *
	 * Read-only inspection of a query argument, so no nonce applies.
	 *
	 * @return string One of ok, invalid, slow, error, or an empty string.
	 */
	public static function newsletter_status() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only display flag.
		$status = isset( $_GET['marketly_news'] ) ? sanitize_key( wp_unslash( $_GET['marketly_news'] ) ) : '';

		return in_array( $status, array( 'ok', 'invalid', 'slow', 'error' ), true ) ? $status : '';
	}
}

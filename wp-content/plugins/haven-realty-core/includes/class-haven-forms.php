<?php
/**
 * Front-end form handling: property inquiry, consultation request, newsletter.
 *
 * All three post to `admin-post.php` and redirect back, so they work with
 * JavaScript disabled. Each is nonce-checked, honeypot-screened, rate-limited
 * per IP, sanitised field by field, then stored as a lead and emailed to the
 * owner. No forms plugin, no external service.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

class Haven_Forms {

	const RATE_LIMIT_SECONDS = 30;

	public static function init() {
		$actions = array( 'haven_inquiry', 'haven_consultation', 'haven_newsletter' );

		foreach ( $actions as $action ) {
			add_action( 'admin_post_nopriv_' . $action, array( __CLASS__, 'handle' ) );
			add_action( 'admin_post_' . $action, array( __CLASS__, 'handle' ) );
		}
	}

	/**
	 * Route a submission to the right handler.
	 */
	public static function handle() {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified immediately below.
		$action = isset( $_POST['action'] ) ? sanitize_key( wp_unslash( $_POST['action'] ) ) : '';

		if ( ! in_array( $action, array( 'haven_inquiry', 'haven_consultation', 'haven_newsletter' ), true ) ) {
			self::redirect_back( 'error' );
		}

		self::verify( $action );

		switch ( $action ) {
			case 'haven_inquiry':
				self::handle_inquiry();
				break;

			case 'haven_consultation':
				self::handle_consultation();
				break;

			case 'haven_newsletter':
				self::handle_newsletter();
				break;
		}
	}

	/**
	 * Nonce, honeypot and rate-limit checks shared by every form.
	 *
	 * @param string $action Form action name.
	 */
	private static function verify( $action ) {
		$nonce = isset( $_POST['haven_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['haven_nonce'] ) ) : '';

		if ( ! wp_verify_nonce( $nonce, $action ) ) {
			self::redirect_back( 'expired' );
		}

		// Honeypot: a real visitor never fills a field hidden from view.
		if ( ! empty( $_POST['haven_website'] ) ) {
			self::redirect_back( 'error' );
		}

		$key = 'haven_rl_' . md5( self::client_ip() . '|' . $action );

		if ( get_transient( $key ) ) {
			self::redirect_back( 'throttled' );
		}

		set_transient( $key, 1, self::RATE_LIMIT_SECONDS );
	}

	/**
	 * Best-effort client IP, used only for rate limiting.
	 *
	 * @return string
	 */
	private static function client_ip() {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '0.0.0.0';

		return filter_var( $ip, FILTER_VALIDATE_IP ) ? $ip : '0.0.0.0';
	}

	/**
	 * Read and sanitise one posted field.
	 *
	 * @param string $key      Field name.
	 * @param string $sanitize Sanitiser: text, email, textarea, url, int.
	 * @return mixed
	 */
	private static function post( $key, $sanitize = 'text' ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- nonce checked in verify().
		if ( ! isset( $_POST[ $key ] ) ) {
			return '';
		}

		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitised below.
		$raw = wp_unslash( $_POST[ $key ] );

		switch ( $sanitize ) {
			case 'email':
				return sanitize_email( $raw );
			case 'textarea':
				return sanitize_textarea_field( $raw );
			case 'url':
				return esc_url_raw( $raw );
			case 'int':
				return absint( $raw );
			default:
				return sanitize_text_field( $raw );
		}
	}

	/**
	 * Property inquiry / tour request.
	 */
	private static function handle_inquiry() {
		$property_id = self::post( 'property_id', 'int' );
		$name        = self::post( 'name' );
		$email       = self::post( 'email', 'email' );
		$message     = self::post( 'message', 'textarea' );

		if ( ! $property_id || Haven_CPT::POST_TYPE !== get_post_type( $property_id ) ) {
			self::redirect_back( 'error' );
		}

		if ( ! $name || ! is_email( $email ) || ! $message ) {
			self::redirect_back( 'invalid' );
		}

		$tour_types = array( 'in_person', 'video_call', 'general_inquiry' );
		$tour_type  = self::post( 'tour_type' );
		$tour_type  = in_array( $tour_type, $tour_types, true ) ? $tour_type : 'general_inquiry';

		$fields = array(
			'name'        => $name,
			'email'       => $email,
			'phone'       => self::post( 'phone' ),
			'message'     => $message,
			'property_id' => $property_id,
			'tour_type'   => $tour_type,
			'tour_date'   => self::post( 'tour_date' ),
			'source_url'  => get_permalink( $property_id ),
		);

		Haven_Leads::create( Haven_Leads::TYPE_INQUIRY, $fields );

		$agent = haven_get_agent( $property_id );

		self::notify(
			$agent['email'],
			sprintf(
				/* translators: %s: property title */
				__( 'New inquiry: %s', 'haven' ),
				get_the_title( $property_id )
			),
			array(
				__( 'Property', 'haven' )  => get_the_title( $property_id ) . ' — ' . get_permalink( $property_id ),
				__( 'Name', 'haven' )      => $name,
				__( 'Email', 'haven' )     => $email,
				__( 'Phone', 'haven' )     => $fields['phone'],
				__( 'Tour Type', 'haven' ) => $tour_type,
				__( 'Date', 'haven' )      => $fields['tour_date'],
				__( 'Message', 'haven' )   => $message,
			),
			$email,
			$name
		);

		self::redirect_back( 'inquiry-sent', get_permalink( $property_id ) );
	}

	/**
	 * Advisory consultation request.
	 */
	private static function handle_consultation() {
		$name  = self::post( 'name' );
		$email = self::post( 'email', 'email' );

		if ( ! $name || ! is_email( $email ) ) {
			self::redirect_back( 'invalid' );
		}

		$services = array( 'Buying', 'Selling', 'Property Valuation', 'Investment Advisory', 'Relocation' );
		$service  = self::post( 'service_type' );
		$service  = in_array( $service, $services, true ) ? $service : 'Buying';

		$fields = array(
			'name'           => $name,
			'email'          => $email,
			'phone'          => self::post( 'phone' ),
			'service_type'   => $service,
			'tour_date'      => self::post( 'preferred_date' ),
			'preferred_time' => self::post( 'preferred_time' ),
			'message'        => self::post( 'notes', 'textarea' ),
			'source_url'     => self::post( 'source_url', 'url' ),
		);

		Haven_Leads::create( Haven_Leads::TYPE_CONSULTATION, $fields );

		self::notify(
			get_theme_mod( 'haven_contact_email', get_option( 'admin_email' ) ),
			sprintf(
				/* translators: %s: service type */
				__( 'Consultation request: %s', 'haven' ),
				$service
			),
			array(
				__( 'Name', 'haven' )    => $name,
				__( 'Email', 'haven' )   => $email,
				__( 'Phone', 'haven' )   => $fields['phone'],
				__( 'Service', 'haven' ) => $service,
				__( 'Date', 'haven' )    => $fields['tour_date'],
				__( 'Time', 'haven' )    => $fields['preferred_time'],
				__( 'Notes', 'haven' )   => $fields['message'],
			),
			$email,
			$name
		);

		self::redirect_back( 'consultation-sent' );
	}

	/**
	 * Newsletter signup.
	 */
	private static function handle_newsletter() {
		$email = self::post( 'email', 'email' );

		if ( ! is_email( $email ) ) {
			self::redirect_back( 'invalid' );
		}

		if ( Haven_Leads::subscriber_exists( $email ) ) {
			self::redirect_back( 'subscribed' );
		}

		Haven_Leads::create(
			Haven_Leads::TYPE_SUBSCRIBER,
			array(
				'email'      => $email,
				'source_url' => self::post( 'source_url', 'url' ),
			)
		);

		self::redirect_back( 'subscribed' );
	}

	/**
	 * Send the owner a plain-text notification.
	 *
	 * @param string $to           Recipient.
	 * @param string $subject      Subject line.
	 * @param array  $rows         Label => value pairs.
	 * @param string $reply_email  Reply-To address.
	 * @param string $reply_name   Reply-To name.
	 */
	private static function notify( $to, $subject, $rows, $reply_email = '', $reply_name = '' ) {
		if ( ! is_email( $to ) ) {
			$to = get_option( 'admin_email' );
		}

		$body = array( sprintf( __( 'New submission from %s', 'haven' ), home_url() ), '' );

		foreach ( $rows as $label => $value ) {
			if ( '' === $value || null === $value ) {
				continue;
			}

			$body[] = $label . ': ' . $value;
		}

		$headers = array( 'Content-Type: text/plain; charset=UTF-8' );

		if ( $reply_email && is_email( $reply_email ) ) {
			$headers[] = sprintf( 'Reply-To: %s <%s>', $reply_name ? $reply_name : $reply_email, $reply_email );
		}

		wp_mail( $to, $subject, implode( "\n", $body ), $headers );
	}

	/**
	 * Redirect back to the submitting page with a status flag.
	 *
	 * @param string $status Status slug read by the theme.
	 * @param string $url    Optional explicit destination.
	 */
	private static function redirect_back( $status, $url = '' ) {
		if ( ! $url ) {
			$url = wp_get_referer();
		}

		if ( ! $url ) {
			$url = home_url( '/' );
		}

		$url = remove_query_arg( array( 'haven_status' ), $url );
		$url = add_query_arg( 'haven_status', rawurlencode( $status ), $url );

		$anchor = in_array( $status, array( 'inquiry-sent', 'invalid', 'expired', 'throttled' ), true ) ? '#inquire' : '';

		wp_safe_redirect( $url . $anchor );
		exit;
	}

	/**
	 * Human-readable message for a redirect status.
	 *
	 * @param string $status Status slug.
	 * @return array{type:string,message:string}|null
	 */
	public static function status_message( $status ) {
		$messages = array(
			'inquiry-sent'      => array(
				'type'    => 'success',
				'message' => __( 'Inquiry dispatched. A Haven advisor will be in touch shortly.', 'haven' ),
			),
			'consultation-sent' => array(
				'type'    => 'success',
				'message' => __( 'Consultation request received. A senior advisor will reach out within one business day.', 'haven' ),
			),
			'subscribed'        => array(
				'type'    => 'success',
				'message' => __( 'You are subscribed to Haven Market Insights.', 'haven' ),
			),
			'invalid'           => array(
				'type'    => 'error',
				'message' => __( 'Please check the required fields and try again.', 'haven' ),
			),
			'expired'           => array(
				'type'    => 'error',
				'message' => __( 'That form expired. Please submit it again.', 'haven' ),
			),
			'throttled'         => array(
				'type'    => 'error',
				'message' => __( 'That was sent a moment ago — please wait before submitting again.', 'haven' ),
			),
			'error'             => array(
				'type'    => 'error',
				'message' => __( 'Something went wrong. Please try again.', 'haven' ),
			),
		);

		return isset( $messages[ $status ] ) ? $messages[ $status ] : null;
	}
}

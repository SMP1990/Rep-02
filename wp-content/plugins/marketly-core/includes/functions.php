<?php
/**
 * Shared helpers used across the plugin.
 *
 * @package Marketly_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * The visitor's IP address, normalised, for rate limiting only.
 *
 * Never stored against a person and never trusted for authorisation — a
 * proxy header can be forged, so this is a throttling key and nothing more.
 *
 * @return string
 */
function marketly_core_client_ip() {
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';

	return filter_var( $ip, FILTER_VALIDATE_IP ) ? $ip : '0.0.0.0';
}

/**
 * Whether this IP has submitted a given form too recently.
 *
 * A short transient keyed on the action and a hash of the IP. The hash means
 * no raw address is written to the options table.
 *
 * @param string $action  Form action key.
 * @param int    $seconds Cool-off window. Default 30.
 * @return bool True when the submission should be rejected.
 */
function marketly_core_is_throttled( $action, $seconds = 30 ) {
	$key = 'mkl_rl_' . md5( $action . '|' . marketly_core_client_ip() );

	if ( get_transient( $key ) ) {
		return true;
	}

	set_transient( $key, 1, max( 1, (int) $seconds ) );

	return false;
}

/**
 * Whether a honeypot field was filled in.
 *
 * The field is visually hidden and has no label, so a person never fills it;
 * a naive bot fills every input it finds.
 *
 * @param array  $source Request array, already unslashed by the caller.
 * @param string $field  Honeypot field name.
 * @return bool
 */
function marketly_core_is_bot( $source, $field = 'marketly_website' ) {
	return ! empty( $source[ $field ] );
}

<?php
/**
 * Newsletter subscribers.
 *
 * A private post type rather than a custom table: it gets the admin list,
 * search, pagination, export and deletion for free, and there is no schema to
 * migrate later. Nothing about it is public — the type is not queryable, not
 * searchable, and new entries cannot be created through wp-admin.
 *
 * @package Marketly_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the subscriber store and its read-only admin screen.
 */
class Marketly_Subscribers {

	const POST_TYPE  = 'marketly_subscriber';
	const META_IP    = '_marketly_ip_hash';
	const META_PAGE  = '_marketly_source';

	/**
	 * Hook everything up.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register' ) );
		add_filter( 'manage_' . self::POST_TYPE . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . self::POST_TYPE . '_posts_custom_column', array( __CLASS__, 'column' ), 10, 2 );
	}

	/**
	 * Register the post type.
	 */
	public static function register() {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => __( 'Subscribers', 'marketly-core' ),
					'singular_name' => __( 'Subscriber', 'marketly-core' ),
					'menu_name'     => __( 'Subscribers', 'marketly-core' ),
					'not_found'     => __( 'No subscribers yet.', 'marketly-core' ),
					'search_items'  => __( 'Search subscribers', 'marketly-core' ),
				),
				'public'              => false,
				'show_ui'             => true,
				'show_in_menu'        => 'edit.php?post_type=' . Marketly_Testimonials::POST_TYPE,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'has_archive'         => false,
				'rewrite'             => false,
				'supports'            => array( 'title' ),
				'capability_type'     => 'post',
				'capabilities'        => array(
					// Entries arrive from the front-end form only.
					'create_posts' => 'do_not_allow',
				),
				'map_meta_cap'        => true,
			)
		);
	}

	/**
	 * Whether an address is already on the list.
	 *
	 * @param string $email Sanitised email.
	 * @return bool
	 */
	public static function exists( $email ) {
		$found = get_posts(
			array(
				'post_type'              => self::POST_TYPE,
				'post_status'            => 'any',
				'title'                  => $email,
				'posts_per_page'         => 1,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		return ! empty( $found );
	}

	/**
	 * Store a subscriber.
	 *
	 * @param string $email  Sanitised, validated email.
	 * @param string $source Page the form was submitted from.
	 * @return int|WP_Error Post ID or error.
	 */
	public static function add( $email, $source = '' ) {
		$id = wp_insert_post(
			array(
				'post_type'   => self::POST_TYPE,
				'post_title'  => $email,
				'post_status' => 'publish',
			),
			true
		);

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		// A hash, not the address: enough to spot abuse from one source,
		// useless as a way to identify a person.
		update_post_meta( $id, self::META_IP, md5( marketly_core_client_ip() ) );
		update_post_meta( $id, self::META_PAGE, esc_url_raw( $source ) );

		return $id;
	}

	/**
	 * List table columns.
	 *
	 * @param array $columns Existing columns.
	 * @return array
	 */
	public static function columns( $columns ) {
		return array(
			'cb'              => isset( $columns['cb'] ) ? $columns['cb'] : '',
			'title'           => __( 'Email address', 'marketly-core' ),
			'marketly_source' => __( 'Signed up from', 'marketly-core' ),
			'date'            => __( 'Date', 'marketly-core' ),
		);
	}

	/**
	 * Render a custom column.
	 *
	 * @param string $column  Column key.
	 * @param int    $post_id Post ID.
	 */
	public static function column( $column, $post_id ) {
		if ( 'marketly_source' === $column ) {
			$source = (string) get_post_meta( $post_id, self::META_PAGE, true );

			if ( $source ) {
				printf( '<a href="%1$s">%1$s</a>', esc_url( $source ) );
			} else {
				echo '—';
			}
		}
	}
}

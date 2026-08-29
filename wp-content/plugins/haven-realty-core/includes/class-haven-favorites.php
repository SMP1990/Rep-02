<?php
/**
 * Favorites — a read-only REST endpoint backing the "Saved" page.
 *
 * Saved IDs live in the visitor's own localStorage, so there is no account, no
 * login and nothing personal on the server. The Saved page posts that list of
 * IDs here and gets back the same property cards the rest of the site renders,
 * which keeps one card template instead of duplicating it in JavaScript.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

class Haven_Favorites {

	const NAMESPACE = 'haven/v1';
	const MAX_IDS   = 60;

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Register the favorites route.
	 */
	public static function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/favorites',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
				'callback'            => array( __CLASS__, 'get_favorites' ),
				'args'                => array(
					'ids' => array(
						'required'          => true,
						'type'              => 'string',
						'description'       => __( 'Comma separated property IDs.', 'haven' ),
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Return rendered cards for the requested published properties.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response
	 */
	public static function get_favorites( $request ) {
		$ids = array_filter( array_map( 'absint', explode( ',', (string) $request->get_param( 'ids' ) ) ) );
		$ids = array_slice( array_unique( $ids ), 0, self::MAX_IDS );

		if ( ! $ids ) {
			return rest_ensure_response(
				array(
					'count' => 0,
					'html'  => '',
				)
			);
		}

		$query = new WP_Query(
			array(
				'post_type'           => Haven_CPT::POST_TYPE,
				'post__in'            => $ids,
				'orderby'             => 'post__in',
				'posts_per_page'      => self::MAX_IDS,
				'post_status'         => 'publish',
				'ignore_sticky_posts' => true,
				'no_found_rows'       => true,
			)
		);

		ob_start();

		while ( $query->have_posts() ) {
			$query->the_post();
			get_template_part( 'template-parts/card', 'property' );
		}

		wp_reset_postdata();

		return rest_ensure_response(
			array(
				'count' => $query->post_count,
				'html'  => ob_get_clean(),
			)
		);
	}
}

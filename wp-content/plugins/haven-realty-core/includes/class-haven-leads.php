<?php
/**
 * Captured leads: property inquiries, consultation requests, newsletter signups.
 *
 * Stored as a private post type so the owner reads them in wp-admin without a
 * forms plugin and without a third-party service holding the data. Not public,
 * not queryable, not in the sitemap.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

class Haven_Leads {

	const POST_TYPE = 'haven_lead';

	const TYPE_INQUIRY      = 'inquiry';
	const TYPE_CONSULTATION = 'consultation';
	const TYPE_SUBSCRIBER   = 'subscriber';

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_types' ), 8 );

		add_filter( 'manage_' . self::POST_TYPE . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . self::POST_TYPE . '_posts_custom_column', array( __CLASS__, 'column_content' ), 10, 2 );
		add_action( 'add_meta_boxes', array( __CLASS__, 'add_meta_box' ) );
		add_action( 'restrict_manage_posts', array( __CLASS__, 'type_filter_dropdown' ) );
		add_action( 'pre_get_posts', array( __CLASS__, 'apply_type_filter' ) );
	}

	/**
	 * Register the private lead post type as a Properties submenu.
	 */
	public static function register_post_types() {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => __( 'Inquiries', 'haven' ),
					'singular_name' => __( 'Inquiry', 'haven' ),
					'menu_name'     => __( 'Inquiries', 'haven' ),
					'all_items'     => __( 'Inquiries & Leads', 'haven' ),
					'edit_item'     => __( 'View Inquiry', 'haven' ),
					'search_items'  => __( 'Search Inquiries', 'haven' ),
					'not_found'     => __( 'No inquiries yet.', 'haven' ),
				),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_ui'             => true,
				'show_in_menu'        => 'edit.php?post_type=' . Haven_CPT::POST_TYPE,
				'show_in_nav_menus'   => false,
				'show_in_rest'        => false,
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
				'supports'            => array( 'title' ),
				'capability_type'     => array( 'haven_lead', 'haven_leads' ),
				'map_meta_cap'        => true,
				'capabilities'        => array(
					// Leads arrive from the front-end form only — never typed by hand.
					'create_posts' => 'do_not_allow',
				),
			)
		);
	}

	/**
	 * Store one lead.
	 *
	 * @param string $type   One of the TYPE_* constants.
	 * @param array  $fields Already-sanitised field values.
	 * @return int|WP_Error Post ID on success.
	 */
	public static function create( $type, $fields ) {
		$email = isset( $fields['email'] ) ? $fields['email'] : '';
		$name  = isset( $fields['name'] ) ? $fields['name'] : '';
		$title = ( $name && self::TYPE_SUBSCRIBER !== $type ) ? $name : $email;

		if ( ! $title ) {
			$title = __( 'Unnamed lead', 'haven' );
		}

		$post_id = wp_insert_post(
			array(
				'post_type'   => self::POST_TYPE,
				'post_title'  => wp_strip_all_tags( $title ),
				'post_status' => 'publish',
			),
			true
		);

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		update_post_meta( $post_id, '_haven_lead_type', $type );

		foreach ( $fields as $key => $value ) {
			update_post_meta( $post_id, '_haven_lead_' . sanitize_key( $key ), $value );
		}

		update_post_meta( $post_id, '_haven_lead_status', 'new' );

		/**
		 * Fires after a lead is stored — hook here for a CRM push.
		 *
		 * @param int    $post_id Lead ID.
		 * @param string $type    Lead type.
		 * @param array  $fields  Sanitised fields.
		 */
		do_action( 'haven_lead_created', $post_id, $type, $fields );

		return $post_id;
	}

	/**
	 * Whether this email is already on the newsletter list.
	 *
	 * @param string $email Email address.
	 * @return bool
	 */
	public static function subscriber_exists( $email ) {
		$existing = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
				'meta_query'     => array(
					'relation' => 'AND',
					array(
						'key'   => '_haven_lead_type',
						'value' => self::TYPE_SUBSCRIBER,
					),
					array(
						'key'   => '_haven_lead_email',
						'value' => $email,
					),
				),
			)
		);

		return ! empty( $existing );
	}

	/**
	 * Lead list-table columns.
	 *
	 * @param array $columns Existing columns.
	 * @return array
	 */
	public static function columns( $columns ) {
		return array(
			'cb'            => isset( $columns['cb'] ) ? $columns['cb'] : '',
			'title'         => __( 'From', 'haven' ),
			'haven_type'    => __( 'Type', 'haven' ),
			'haven_email'   => __( 'Email', 'haven' ),
			'haven_phone'   => __( 'Phone', 'haven' ),
			'haven_subject' => __( 'Regarding', 'haven' ),
			'date'          => __( 'Received', 'haven' ),
		);
	}

	/**
	 * Render one lead column.
	 *
	 * @param string $column  Column key.
	 * @param int    $post_id Lead ID.
	 */
	public static function column_content( $column, $post_id ) {
		switch ( $column ) {
			case 'haven_type':
				$type   = get_post_meta( $post_id, '_haven_lead_type', true );
				$labels = array(
					self::TYPE_INQUIRY      => __( 'Property Inquiry', 'haven' ),
					self::TYPE_CONSULTATION => __( 'Consultation', 'haven' ),
					self::TYPE_SUBSCRIBER   => __( 'Newsletter', 'haven' ),
				);
				printf(
					'<span class="haven-pill haven-pill--active">%s</span>',
					esc_html( isset( $labels[ $type ] ) ? $labels[ $type ] : $type )
				);
				break;

			case 'haven_email':
				$email = get_post_meta( $post_id, '_haven_lead_email', true );
				if ( $email ) {
					printf( '<a href="mailto:%1$s">%1$s</a>', esc_attr( $email ) );
				}
				break;

			case 'haven_phone':
				echo esc_html( get_post_meta( $post_id, '_haven_lead_phone', true ) ?: '—' );
				break;

			case 'haven_subject':
				$property_id = (int) get_post_meta( $post_id, '_haven_lead_property_id', true );

				if ( $property_id ) {
					printf(
						'<a href="%s">%s</a>',
						esc_url( (string) get_edit_post_link( $property_id ) ),
						esc_html( get_the_title( $property_id ) )
					);
					break;
				}

				echo esc_html( get_post_meta( $post_id, '_haven_lead_service_type', true ) ?: '—' );
				break;
		}
	}

	/**
	 * Read-only detail panel on the lead edit screen.
	 */
	public static function add_meta_box() {
		add_meta_box(
			'haven-lead-detail',
			__( 'Lead Detail', 'haven' ),
			array( __CLASS__, 'render_meta_box' ),
			self::POST_TYPE,
			'normal',
			'high'
		);
	}

	/**
	 * Print every stored field for one lead.
	 *
	 * @param WP_Post $post Lead post.
	 */
	public static function render_meta_box( $post ) {
		$labels = array(
			'_haven_lead_type'         => __( 'Type', 'haven' ),
			'_haven_lead_name'         => __( 'Name', 'haven' ),
			'_haven_lead_email'        => __( 'Email', 'haven' ),
			'_haven_lead_phone'        => __( 'Phone', 'haven' ),
			'_haven_lead_property_id'  => __( 'Property', 'haven' ),
			'_haven_lead_tour_type'    => __( 'Tour Type', 'haven' ),
			'_haven_lead_tour_date'    => __( 'Preferred Date', 'haven' ),
			'_haven_lead_service_type' => __( 'Service', 'haven' ),
			'_haven_lead_preferred_time' => __( 'Preferred Time', 'haven' ),
			'_haven_lead_message'      => __( 'Message', 'haven' ),
			'_haven_lead_source_url'   => __( 'Sent From', 'haven' ),
		);

		echo '<table class="widefat striped"><tbody>';

		foreach ( $labels as $key => $label ) {
			$value = get_post_meta( $post->ID, $key, true );

			if ( '' === $value || null === $value ) {
				continue;
			}

			if ( '_haven_lead_property_id' === $key ) {
				$value = sprintf(
					'<a href="%s">%s</a>',
					esc_url( (string) get_edit_post_link( (int) $value ) ),
					esc_html( get_the_title( (int) $value ) )
				);
			} elseif ( '_haven_lead_source_url' === $key ) {
				$value = sprintf( '<a href="%1$s">%1$s</a>', esc_url( $value ) );
			} else {
				$value = nl2br( esc_html( $value ) );
			}

			printf(
				'<tr><th style="width:180px;text-align:left">%s</th><td>%s</td></tr>',
				esc_html( $label ),
				$value // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped per branch above.
			);
		}

		echo '</tbody></table>';
	}

	/**
	 * "All types" dropdown above the lead list.
	 */
	public static function type_filter_dropdown() {
		$screen = get_current_screen();

		if ( ! $screen || self::POST_TYPE !== $screen->post_type ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- admin list filter.
		$current = isset( $_GET['haven_lead_type'] ) ? sanitize_key( wp_unslash( $_GET['haven_lead_type'] ) ) : '';

		$options = array(
			''                      => __( 'All types', 'haven' ),
			self::TYPE_INQUIRY      => __( 'Property Inquiries', 'haven' ),
			self::TYPE_CONSULTATION => __( 'Consultations', 'haven' ),
			self::TYPE_SUBSCRIBER   => __( 'Newsletter Signups', 'haven' ),
		);

		echo '<select name="haven_lead_type">';
		foreach ( $options as $value => $label ) {
			printf(
				'<option value="%1$s" %2$s>%3$s</option>',
				esc_attr( $value ),
				selected( $current, $value, false ),
				esc_html( $label )
			);
		}
		echo '</select>';
	}

	/**
	 * Apply the lead-type dropdown to the admin query.
	 *
	 * @param WP_Query $query Current query.
	 */
	public static function apply_type_filter( $query ) {
		if ( ! is_admin() || ! $query->is_main_query() || self::POST_TYPE !== $query->get( 'post_type' ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- admin list filter.
		$type = isset( $_GET['haven_lead_type'] ) ? sanitize_key( wp_unslash( $_GET['haven_lead_type'] ) ) : '';

		if ( ! $type ) {
			return;
		}

		$query->set(
			'meta_query',
			array(
				array(
					'key'   => '_haven_lead_type',
					'value' => $type,
				),
			)
		);
	}
}

<?php
/**
 * The Properties admin screen — meta boxes, saving, list-table columns.
 *
 * Everything the owner needs sits on one edit screen: price, address, specs,
 * gallery, agent, SEO. Publish/unpublish and Featured live in the sidebar next
 * to the Publish button where they are hard to miss.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

class Haven_Admin {

	const NONCE_ACTION = 'haven_save_property';
	const NONCE_NAME   = 'haven_property_nonce';

	public static function init() {
		add_action( 'add_meta_boxes', array( __CLASS__, 'add_meta_boxes' ) );
		add_action( 'save_post_' . Haven_CPT::POST_TYPE, array( __CLASS__, 'save' ), 10, 2 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );

		add_filter( 'manage_' . Haven_CPT::POST_TYPE . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . Haven_CPT::POST_TYPE . '_posts_custom_column', array( __CLASS__, 'column_content' ), 10, 2 );
		add_filter( 'manage_edit-' . Haven_CPT::POST_TYPE . '_sortable_columns', array( __CLASS__, 'sortable_columns' ) );
		add_action( 'pre_get_posts', array( __CLASS__, 'sort_admin_columns' ) );

		add_filter( 'enter_title_here', array( __CLASS__, 'title_placeholder' ), 10, 2 );
		add_filter( 'post_updated_messages', array( __CLASS__, 'updated_messages' ) );
	}

	/**
	 * Load the media picker and the small admin stylesheet on property screens only.
	 *
	 * @param string $hook Current admin page.
	 */
	public static function enqueue( $hook ) {
		$screen = get_current_screen();

		if ( ! $screen || Haven_CPT::POST_TYPE !== $screen->post_type ) {
			return;
		}

		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}

		wp_enqueue_media();

		wp_enqueue_style(
			'haven-admin',
			HAVEN_CORE_URL . 'assets/admin.css',
			array(),
			HAVEN_CORE_VERSION
		);

		wp_enqueue_script(
			'haven-admin',
			HAVEN_CORE_URL . 'assets/admin.js',
			array( 'jquery', 'jquery-ui-sortable' ),
			HAVEN_CORE_VERSION,
			true
		);

		wp_localize_script(
			'haven-admin',
			'havenAdmin',
			array(
				'galleryTitle'  => __( 'Select property images', 'haven' ),
				'galleryButton' => __( 'Use these images', 'haven' ),
				'imageTitle'    => __( 'Select image', 'haven' ),
				'imageButton'   => __( 'Use this image', 'haven' ),
				'removeLabel'   => __( 'Remove', 'haven' ),
			)
		);
	}

	/**
	 * Register the property meta boxes.
	 */
	public static function add_meta_boxes() {
		add_meta_box(
			'haven-price',
			__( 'Price', 'haven' ),
			array( __CLASS__, 'render_group' ),
			Haven_CPT::POST_TYPE,
			'normal',
			'high',
			array( 'group' => 'pricing' )
		);

		add_meta_box(
			'haven-specs',
			__( 'Specification', 'haven' ),
			array( __CLASS__, 'render_group' ),
			Haven_CPT::POST_TYPE,
			'normal',
			'high',
			array( 'group' => 'specs' )
		);

		add_meta_box(
			'haven-address',
			__( 'Address', 'haven' ),
			array( __CLASS__, 'render_group' ),
			Haven_CPT::POST_TYPE,
			'normal',
			'default',
			array( 'group' => 'address' )
		);

		add_meta_box(
			'haven-gallery',
			__( 'Gallery & Video', 'haven' ),
			array( __CLASS__, 'render_group' ),
			Haven_CPT::POST_TYPE,
			'normal',
			'default',
			array( 'group' => 'gallery' )
		);

		add_meta_box(
			'haven-agent',
			__( 'Listing Representative', 'haven' ),
			array( __CLASS__, 'render_group' ),
			Haven_CPT::POST_TYPE,
			'normal',
			'default',
			array( 'group' => 'agent' )
		);

		add_meta_box(
			'haven-seo',
			__( 'Search Appearance', 'haven' ),
			array( __CLASS__, 'render_group' ),
			Haven_CPT::POST_TYPE,
			'normal',
			'low',
			array( 'group' => 'seo' )
		);

		add_meta_box(
			'haven-status',
			__( 'Listing Status', 'haven' ),
			array( __CLASS__, 'render_group' ),
			Haven_CPT::POST_TYPE,
			'side',
			'high',
			array( 'group' => 'status' )
		);
	}

	/**
	 * Render every field belonging to one group.
	 *
	 * @param WP_Post $post    Current property.
	 * @param array   $metabox Meta box args, carrying the group name.
	 */
	public static function render_group( $post, $metabox ) {
		static $nonce_printed = false;

		if ( ! $nonce_printed ) {
			wp_nonce_field( self::NONCE_ACTION, self::NONCE_NAME );
			$nonce_printed = true;
		}

		$group  = $metabox['args']['group'];
		$schema = Haven_Meta::schema();

		echo '<div class="haven-fields haven-fields--' . esc_attr( $group ) . '">';

		foreach ( $schema as $key => $field ) {
			if ( $field['group'] !== $group ) {
				continue;
			}

			self::render_field( $key, $field, Haven_Meta::get( $post->ID, $key ) );
		}

		echo '</div>';

		if ( 'status' === $group ) {
			printf(
				'<p class="haven-hint">%s</p>',
				esc_html__( 'Unpublish a listing with the Status control in the Publish box above — a draft or private property disappears from the site immediately.', 'haven' )
			);
		}
	}

	/**
	 * Render a single field.
	 *
	 * @param string $key   Field key.
	 * @param array  $field Field definition.
	 * @param mixed  $value Current value.
	 */
	private static function render_field( $key, $field, $value ) {
		$name = Haven_Meta::PREFIX . $key;
		$id   = 'haven-field-' . $key;

		echo '<p class="haven-field haven-field--' . esc_attr( $field['type'] ) . '">';

		if ( 'checkbox' !== $field['type'] ) {
			printf(
				'<label class="haven-field__label" for="%1$s">%2$s</label>',
				esc_attr( $id ),
				esc_html( $field['label'] )
			);
		}

		switch ( $field['type'] ) {
			case 'textarea':
				printf(
					'<textarea class="widefat" id="%1$s" name="%2$s" rows="3">%3$s</textarea>',
					esc_attr( $id ),
					esc_attr( $name ),
					esc_textarea( $value )
				);
				break;

			case 'checkbox':
				printf(
					'<label class="haven-field__checkbox" for="%1$s"><input type="checkbox" id="%1$s" name="%2$s" value="1" %3$s> %4$s</label>',
					esc_attr( $id ),
					esc_attr( $name ),
					checked( 1, (int) $value, false ),
					esc_html( $field['label'] )
				);
				break;

			case 'select':
				printf( '<select class="widefat" id="%1$s" name="%2$s">', esc_attr( $id ), esc_attr( $name ) );
				foreach ( $field['options'] as $option_value => $option_label ) {
					printf(
						'<option value="%1$s" %2$s>%3$s</option>',
						esc_attr( $option_value ),
						selected( $value, $option_value, false ),
						esc_html( $option_label )
					);
				}
				echo '</select>';
				break;

			case 'gallery':
				self::render_gallery_field( $id, $name, $value );
				break;

			case 'image':
				self::render_image_field( $id, $name, (int) $value );
				break;

			case 'number':
				printf(
					'<input type="number" class="widefat" id="%1$s" name="%2$s" value="%3$s" min="%4$s" step="%5$s">',
					esc_attr( $id ),
					esc_attr( $name ),
					esc_attr( $value ),
					esc_attr( isset( $field['min'] ) ? $field['min'] : '' ),
					esc_attr( isset( $field['step'] ) ? $field['step'] : 'any' )
				);
				break;

			default:
				printf(
					'<input type="%1$s" class="widefat" id="%2$s" name="%3$s" value="%4$s">',
					esc_attr( 'email' === $field['type'] ? 'email' : ( 'url' === $field['type'] ? 'url' : 'text' ) ),
					esc_attr( $id ),
					esc_attr( $name ),
					esc_attr( $value )
				);
		}

		if ( ! empty( $field['desc'] ) ) {
			printf( '<span class="haven-field__desc">%s</span>', esc_html( $field['desc'] ) );
		}

		echo '</p>';
	}

	/**
	 * Gallery picker: a sortable strip of Media Library images stored as CSV IDs.
	 *
	 * @param string $id    Element ID.
	 * @param string $name  Input name.
	 * @param string $value Comma separated attachment IDs.
	 */
	private static function render_gallery_field( $id, $name, $value ) {
		$ids = array_filter( array_map( 'absint', explode( ',', (string) $value ) ) );

		echo '<span class="haven-gallery" data-haven-gallery>';
		printf(
			'<input type="hidden" id="%1$s" name="%2$s" value="%3$s" data-haven-gallery-input>',
			esc_attr( $id ),
			esc_attr( $name ),
			esc_attr( implode( ',', $ids ) )
		);

		echo '<span class="haven-gallery__grid" data-haven-gallery-grid>';
		foreach ( $ids as $attachment_id ) {
			self::render_gallery_item( $attachment_id );
		}
		echo '</span>';

		printf(
			'<button type="button" class="button haven-gallery__add" data-haven-gallery-add>%s</button>',
			esc_html__( 'Add / edit images', 'haven' )
		);
		echo '</span>';
	}

	/**
	 * One thumbnail inside the gallery picker.
	 *
	 * @param int $attachment_id Attachment ID.
	 */
	public static function render_gallery_item( $attachment_id ) {
		$thumb = wp_get_attachment_image( $attachment_id, 'thumbnail', false, array( 'alt' => '' ) );

		if ( ! $thumb ) {
			return;
		}

		printf(
			'<span class="haven-gallery__item" data-id="%1$d">%2$s<button type="button" class="haven-gallery__remove" data-haven-gallery-remove aria-label="%3$s">&times;</button></span>',
			absint( $attachment_id ),
			$thumb, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by core.
			esc_attr__( 'Remove image', 'haven' )
		);
	}

	/**
	 * Single-image picker used for the agent photo.
	 *
	 * @param string $id    Element ID.
	 * @param string $name  Input name.
	 * @param int    $value Attachment ID.
	 */
	private static function render_image_field( $id, $name, $value ) {
		echo '<span class="haven-image" data-haven-image>';
		printf(
			'<input type="hidden" id="%1$s" name="%2$s" value="%3$d" data-haven-image-input>',
			esc_attr( $id ),
			esc_attr( $name ),
			absint( $value )
		);

		echo '<span class="haven-image__preview" data-haven-image-preview>';
		if ( $value ) {
			echo wp_get_attachment_image( $value, 'thumbnail', false, array( 'alt' => '' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
		echo '</span>';

		printf(
			'<button type="button" class="button haven-image__select" data-haven-image-select>%s</button> <button type="button" class="button-link haven-image__clear" data-haven-image-clear>%s</button>',
			esc_html__( 'Choose image', 'haven' ),
			esc_html__( 'Clear', 'haven' )
		);
		echo '</span>';
	}

	/**
	 * Persist the submitted meta.
	 *
	 * @param int     $post_id Property ID.
	 * @param WP_Post $post    Property object.
	 */
	public static function save( $post_id, $post ) {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}

		if ( ! isset( $_POST[ self::NONCE_NAME ] ) ) {
			return;
		}

		$nonce = sanitize_text_field( wp_unslash( $_POST[ self::NONCE_NAME ] ) );

		if ( ! wp_verify_nonce( $nonce, self::NONCE_ACTION ) ) {
			return;
		}

		if ( ! current_user_can( 'edit_property', $post_id ) ) {
			return;
		}

		foreach ( Haven_Meta::schema() as $key => $field ) {
			$name = Haven_Meta::PREFIX . $key;

			if ( 'checkbox' === $field['type'] ) {
				$raw = isset( $_POST[ $name ] ) ? 1 : 0;
			} elseif ( isset( $_POST[ $name ] ) ) {
				$raw = wp_unslash( $_POST[ $name ] ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- sanitised below.
			} else {
				continue;
			}

			$clean = Haven_Meta::sanitize_value( $raw, $field );

			// A zero is a real value for specs like garage spaces, so only an
			// empty string clears the field.
			if ( '' === $clean ) {
				delete_post_meta( $post_id, $name );
				continue;
			}

			update_post_meta( $post_id, $name, $clean );
		}
	}

	/**
	 * Property list-table columns.
	 *
	 * @param array $columns Existing columns.
	 * @return array
	 */
	public static function columns( $columns ) {
		$new = array();

		foreach ( $columns as $key => $label ) {
			if ( 'title' === $key ) {
				$new['haven_thumb'] = __( 'Image', 'haven' );
			}

			$new[ $key ] = $label;

			if ( 'title' === $key ) {
				$new['haven_price']    = __( 'Price', 'haven' );
				$new['haven_specs']    = __( 'Beds / Baths / Area', 'haven' );
				$new['haven_status']   = __( 'Availability', 'haven' );
				$new['haven_featured'] = __( 'Featured', 'haven' );
			}
		}

		return $new;
	}

	/**
	 * Render one custom column.
	 *
	 * @param string $column  Column key.
	 * @param int    $post_id Property ID.
	 */
	public static function column_content( $column, $post_id ) {
		switch ( $column ) {
			case 'haven_thumb':
				if ( has_post_thumbnail( $post_id ) ) {
					echo get_the_post_thumbnail( $post_id, array( 60, 42 ), array( 'style' => 'border-radius:4px;object-fit:cover;' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				} else {
					echo '<span class="haven-col-empty">&mdash;</span>';
				}
				break;

			case 'haven_price':
				echo esc_html( haven_get_price_display( $post_id ) );
				break;

			case 'haven_specs':
				printf(
					'%s / %s / %s',
					esc_html( Haven_Meta::get( $post_id, 'bedrooms' ) ?: '—' ),
					esc_html( Haven_Meta::get( $post_id, 'bathrooms' ) ?: '—' ),
					esc_html( Haven_Meta::get( $post_id, 'area_sqft' ) ? number_format_i18n( (float) Haven_Meta::get( $post_id, 'area_sqft' ) ) . ' sq ft' : '—' )
				);
				break;

			case 'haven_status':
				$status = Haven_Meta::get( $post_id, 'availability' );
				$labels = Haven_Meta::schema()['availability']['options'];
				printf(
					'<span class="haven-pill haven-pill--%1$s">%2$s</span>',
					esc_attr( $status ),
					esc_html( isset( $labels[ $status ] ) ? $labels[ $status ] : $status )
				);
				break;

			case 'haven_featured':
				echo Haven_Meta::get( $post_id, 'featured' )
					? '<span class="dashicons dashicons-star-filled" style="color:#C19D68"></span>'
					: '<span class="dashicons dashicons-star-empty" style="color:#c3c4c7"></span>';
				break;
		}
	}

	/**
	 * Make price and featured sortable.
	 *
	 * @param array $columns Sortable columns.
	 * @return array
	 */
	public static function sortable_columns( $columns ) {
		$columns['haven_price']    = 'haven_price';
		$columns['haven_featured'] = 'haven_featured';

		return $columns;
	}

	/**
	 * Apply the meta ordering requested by a sortable column.
	 *
	 * @param WP_Query $query Current admin query.
	 */
	public static function sort_admin_columns( $query ) {
		if ( ! is_admin() || ! $query->is_main_query() ) {
			return;
		}

		$orderby = $query->get( 'orderby' );

		if ( 'haven_price' === $orderby ) {
			$query->set( 'meta_key', Haven_Meta::PREFIX . 'price' );
			$query->set( 'orderby', 'meta_value_num' );
		} elseif ( 'haven_featured' === $orderby ) {
			$query->set( 'meta_key', Haven_Meta::PREFIX . 'featured' );
			$query->set( 'orderby', 'meta_value_num' );
		}
	}

	/**
	 * Nudge the owner toward a descriptive, SEO-friendly listing title.
	 *
	 * @param string  $text Placeholder.
	 * @param WP_Post $post Current post.
	 * @return string
	 */
	public static function title_placeholder( $text, $post ) {
		if ( $post && Haven_CPT::POST_TYPE === $post->post_type ) {
			return __( 'Property title — e.g. Modern Oceanview Villa', 'haven' );
		}

		return $text;
	}

	/**
	 * Property-specific admin notices after saving.
	 *
	 * @param array $messages Existing messages.
	 * @return array
	 */
	public static function updated_messages( $messages ) {
		$post = get_post();
		$link = $post ? sprintf( ' <a href="%s">%s</a>', esc_url( get_permalink( $post ) ), esc_html__( 'View property', 'haven' ) ) : '';

		$messages[ Haven_CPT::POST_TYPE ] = array(
			0  => '',
			1  => __( 'Property updated.', 'haven' ) . $link,
			2  => __( 'Custom field updated.', 'haven' ),
			3  => __( 'Custom field deleted.', 'haven' ),
			4  => __( 'Property updated.', 'haven' ),
			5  => __( 'Property restored to revision.', 'haven' ),
			6  => __( 'Property published.', 'haven' ) . $link,
			7  => __( 'Property saved.', 'haven' ),
			8  => __( 'Property submitted.', 'haven' ),
			9  => __( 'Property scheduled.', 'haven' ) . $link,
			10 => __( 'Property draft updated.', 'haven' ),
		);

		return $messages;
	}
}

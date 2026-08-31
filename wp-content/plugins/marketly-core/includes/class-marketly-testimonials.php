<?php
/**
 * The Testimonial post type.
 *
 * Lives in the plugin rather than the theme so the reviews the owner writes
 * survive a theme change. Not publicly queryable — a testimonial is a snippet
 * shown on the storefront, not a page anyone should land on.
 *
 * @package Marketly_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the post type, its meta and the editing UI.
 */
class Marketly_Testimonials {

	const POST_TYPE = 'marketly_testimonial';
	const META_ROLE = '_marketly_role';
	const META_RATE = '_marketly_rating';

	/**
	 * Hook everything up.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register' ) );
		add_action( 'add_meta_boxes', array( __CLASS__, 'add_meta_box' ) );
		add_action( 'save_post_' . self::POST_TYPE, array( __CLASS__, 'save' ), 10, 2 );
		add_filter( 'manage_' . self::POST_TYPE . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . self::POST_TYPE . '_posts_custom_column', array( __CLASS__, 'column' ), 10, 2 );
	}

	/**
	 * Register the post type and its meta.
	 */
	public static function register() {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'             => array(
					'name'               => __( 'Testimonials', 'marketly-core' ),
					'singular_name'      => __( 'Testimonial', 'marketly-core' ),
					'add_new_item'       => __( 'Add Testimonial', 'marketly-core' ),
					'edit_item'          => __( 'Edit Testimonial', 'marketly-core' ),
					'search_items'       => __( 'Search testimonials', 'marketly-core' ),
					'not_found'          => __( 'No testimonials yet.', 'marketly-core' ),
					'menu_name'          => __( 'Testimonials', 'marketly-core' ),
				),
				'public'             => false,
				'show_ui'            => true,
				'show_in_menu'       => true,
				'publicly_queryable' => false,
				'exclude_from_search' => true,
				'has_archive'        => false,
				'rewrite'            => false,
				'menu_icon'          => 'dashicons-format-quote',
				'menu_position'      => 26,
				'supports'           => array( 'title', 'editor', 'thumbnail', 'page-attributes' ),
			)
		);

		// Registered so the REST API and any future block respect the same
		// sanitising and permission rules the meta box uses.
		register_post_meta(
			self::POST_TYPE,
			self::META_ROLE,
			array(
				'type'              => 'string',
				'single'            => true,
				'default'           => '',
				'show_in_rest'      => false,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => array( __CLASS__, 'can_edit' ),
			)
		);

		register_post_meta(
			self::POST_TYPE,
			self::META_RATE,
			array(
				'type'              => 'integer',
				'single'            => true,
				'default'           => 5,
				'show_in_rest'      => false,
				'sanitize_callback' => array( __CLASS__, 'sanitize_rating' ),
				'auth_callback'     => array( __CLASS__, 'can_edit' ),
			)
		);
	}

	/**
	 * Whether the current user may edit testimonial meta.
	 *
	 * @return bool
	 */
	public static function can_edit() {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Clamp a rating to 1-5.
	 *
	 * @param mixed $value Raw value.
	 * @return int
	 */
	public static function sanitize_rating( $value ) {
		return max( 1, min( 5, (int) $value ) );
	}

	/**
	 * The single meta box.
	 */
	public static function add_meta_box() {
		add_meta_box(
			'marketly_testimonial_details',
			__( 'Reviewer Details', 'marketly-core' ),
			array( __CLASS__, 'render_meta_box' ),
			self::POST_TYPE,
			'side',
			'high'
		);
	}

	/**
	 * Render the meta box.
	 *
	 * @param WP_Post $post Current post.
	 */
	public static function render_meta_box( $post ) {
		wp_nonce_field( 'marketly_testimonial_save', 'marketly_testimonial_nonce' );

		$role   = (string) get_post_meta( $post->ID, self::META_ROLE, true );
		$rating = (int) get_post_meta( $post->ID, self::META_RATE, true );
		$rating = $rating ? $rating : 5;
		?>
		<p>
			<label for="marketly_role"><strong><?php esc_html_e( 'Label under the name', 'marketly-core' ); ?></strong></label>
			<input type="text" id="marketly_role" name="marketly_role" class="widefat"
				value="<?php echo esc_attr( $role ); ?>"
				placeholder="<?php esc_attr_e( 'Verified Buyer', 'marketly-core' ); ?>">
		</p>

		<p>
			<label for="marketly_rating"><strong><?php esc_html_e( 'Rating', 'marketly-core' ); ?></strong></label>
			<select id="marketly_rating" name="marketly_rating" class="widefat">
				<?php for ( $i = 5; $i >= 1; $i-- ) : ?>
					<option value="<?php echo esc_attr( (string) $i ); ?>" <?php selected( $rating, $i ); ?>>
						<?php
						printf(
							/* translators: %d: star rating out of five. */
							esc_html( _n( '%d star', '%d stars', $i, 'marketly-core' ) ),
							(int) $i
						);
						?>
					</option>
				<?php endfor; ?>
			</select>
		</p>

		<p class="description">
			<?php esc_html_e( 'The post title is the reviewer’s name, the content is their quote, and the featured image is their photo.', 'marketly-core' ); ?>
		</p>
		<?php
	}

	/**
	 * Save the meta box.
	 *
	 * Checks nonce, autosave, revision and capability before writing anything.
	 *
	 * @param int     $post_id Post ID.
	 * @param WP_Post $post    Post object.
	 */
	public static function save( $post_id, $post ) {
		if ( ! isset( $_POST['marketly_testimonial_nonce'] ) ) {
			return;
		}

		$nonce = sanitize_text_field( wp_unslash( $_POST['marketly_testimonial_nonce'] ) );

		if ( ! wp_verify_nonce( $nonce, 'marketly_testimonial_save' ) ) {
			return;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		if ( wp_is_post_revision( $post_id ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$role = isset( $_POST['marketly_role'] )
			? sanitize_text_field( wp_unslash( $_POST['marketly_role'] ) )
			: '';

		$rating = isset( $_POST['marketly_rating'] )
			? self::sanitize_rating( wp_unslash( $_POST['marketly_rating'] ) )
			: 5;

		update_post_meta( $post_id, self::META_ROLE, $role );
		update_post_meta( $post_id, self::META_RATE, $rating );
	}

	/**
	 * Add a rating column to the list table.
	 *
	 * @param array $columns Existing columns.
	 * @return array
	 */
	public static function columns( $columns ) {
		$out = array();

		foreach ( $columns as $key => $label ) {
			$out[ $key ] = $label;

			if ( 'title' === $key ) {
				$out['marketly_role']   = __( 'Label', 'marketly-core' );
				$out['marketly_rating'] = __( 'Rating', 'marketly-core' );
			}
		}

		return $out;
	}

	/**
	 * Render a custom column.
	 *
	 * @param string $column  Column key.
	 * @param int    $post_id Post ID.
	 */
	public static function column( $column, $post_id ) {
		if ( 'marketly_role' === $column ) {
			echo esc_html( (string) get_post_meta( $post_id, self::META_ROLE, true ) );
		}

		if ( 'marketly_rating' === $column ) {
			$rating = (int) get_post_meta( $post_id, self::META_RATE, true );
			echo esc_html( str_repeat( '★', max( 0, $rating ) ) );
		}
	}
}

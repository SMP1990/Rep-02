<?php
/**
 * One-click demo content.
 *
 * Products are database records, not code, so they cannot travel in a theme.
 * This builds a representative catalogue on request instead: six categories,
 * twenty products with prices, sale prices, stock, ratings and sales history,
 * three testimonials, and the Customizer settings that make the homepage look
 * like the design.
 *
 * Everything it creates is tracked, so it can all be removed again cleanly.
 *
 * @package Marketly_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Imports and removes the demo catalogue.
 */
class Marketly_Demo {

	const TRACK  = 'marketly_demo_ids';
	const ACTION = 'marketly_demo';

	/**
	 * Hook the admin screen and its handler.
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_post_' . self::ACTION, array( __CLASS__, 'handle' ) );
	}

	/**
	 * Add the screen under the Testimonials menu.
	 */
	public static function menu() {
		add_submenu_page(
			'edit.php?post_type=' . Marketly_Testimonials::POST_TYPE,
			__( 'Demo Content', 'marketly-core' ),
			__( 'Demo Content', 'marketly-core' ),
			'manage_options',
			'marketly-demo',
			array( __CLASS__, 'render' )
		);
	}

	/**
	 * The admin screen.
	 */
	public static function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to do this.', 'marketly-core' ) );
		}

		$tracked  = (array) get_option( self::TRACK, array() );
		$imported = ! empty( $tracked['products'] );
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only display flag on a redirect.
		$notice = isset( $_GET['marketly_demo'] ) ? sanitize_key( wp_unslash( $_GET['marketly_demo'] ) ) : '';
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Marketly Demo Content', 'marketly-core' ); ?></h1>

			<?php if ( 'imported' === $notice ) : ?>
				<div class="notice notice-success is-dismissible"><p>
					<?php esc_html_e( 'Demo content imported. Visit your homepage to see it.', 'marketly-core' ); ?>
				</p></div>
			<?php elseif ( 'removed' === $notice ) : ?>
				<div class="notice notice-success is-dismissible"><p>
					<?php esc_html_e( 'Demo content removed.', 'marketly-core' ); ?>
				</p></div>
			<?php elseif ( 'nogd' === $notice ) : ?>
				<div class="notice notice-error"><p>
					<?php esc_html_e( 'This server has no GD image library, so the placeholder artwork could not be drawn. Products were still created, without images.', 'marketly-core' ); ?>
				</p></div>
			<?php endif; ?>

			<?php if ( ! class_exists( 'WooCommerce' ) ) : ?>
				<div class="notice notice-error"><p>
					<?php esc_html_e( 'WooCommerce is not active. Activate it before importing, or only the testimonials will be created.', 'marketly-core' ); ?>
				</p></div>
			<?php endif; ?>

			<p style="max-width:44em">
				<?php esc_html_e( 'Fills an empty store so you can see the design working: six categories, thirty-nine real products across footwear, outerwear, jewellery, electronics, homeware, beauty, grocery and sports — each with photography, brand, colourways, sizes, a specification table, feature list, stock level and reviews — plus the homepage hero, promo banners and flash deal.', 'marketly-core' ); ?>
			</p>

			<p style="max-width:44em">
				<strong><?php esc_html_e( 'This downloads about 90 photographs, so give it two or three minutes.', 'marketly-core' ); ?></strong>
				<?php esc_html_e( 'They come from Unsplash, whose licence allows commercial use, and are copied into your own media library rather than hotlinked. If your server cannot reach the internet, the import still completes and uses a drawn placeholder wherever a photograph could not be fetched.', 'marketly-core' ); ?>
			</p>

			<p style="max-width:44em" class="description">
				<?php esc_html_e( 'Demo photography is for previewing the design. Replace it with your own product photos before you launch.', 'marketly-core' ); ?>
			</p>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="<?php echo esc_attr( self::ACTION ); ?>">
				<?php wp_nonce_field( self::ACTION, 'marketly_demo_nonce' ); ?>

				<p>
					<button type="submit" name="mode" value="import" class="button button-primary button-hero">
						<?php
						echo $imported
							? esc_html__( 'Re-import demo content', 'marketly-core' )
							: esc_html__( 'Import demo content', 'marketly-core' );
						?>
					</button>

					<?php if ( $imported ) : ?>
						<button type="submit" name="mode" value="remove" class="button button-hero"
							onclick="return confirm('<?php echo esc_js( __( 'Delete everything the importer created? Products, categories, images and reviews you added yourself are left alone.', 'marketly-core' ) ); ?>');">
							<?php esc_html_e( 'Remove demo content', 'marketly-core' ); ?>
						</button>
					<?php endif; ?>
				</p>
			</form>

			<?php if ( $imported ) : ?>
				<p class="description">
					<?php
					printf(
						/* translators: 1: product count, 2: category count. */
						esc_html__( 'Currently tracking %1$d demo products across %2$d categories.', 'marketly-core' ),
						count( (array) $tracked['products'] ),
						count( (array) ( $tracked['terms'] ?? array() ) )
					);
					?>
				</p>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Run the import or the removal.
	 */
	public static function handle() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to do this.', 'marketly-core' ) );
		}

		check_admin_referer( self::ACTION, 'marketly_demo_nonce' );

		$mode = isset( $_POST['mode'] ) ? sanitize_key( wp_unslash( $_POST['mode'] ) ) : '';

		if ( 'remove' === $mode ) {
			self::remove();
			self::back( 'removed' );
		}

		// Importing builds images and twenty products; the default limits on
		// a shared host are not always generous enough.
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 300 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- Disabled on some hosts; failure here is not fatal.
		}

		wp_raise_memory_limit( 'image' );

		self::remove(); // Re-import replaces rather than duplicates.
		$made = self::import();

		self::back( Marketly_Demo_Images::supported() ? 'imported' : 'nogd' );
	}

	/**
	 * Redirect back to the screen with a flag.
	 *
	 * @param string $status Status slug.
	 */
	private static function back( $status ) {
		wp_safe_redirect(
			add_query_arg(
				array(
					'post_type'     => Marketly_Testimonials::POST_TYPE,
					'page'          => 'marketly-demo',
					'marketly_demo' => $status,
				),
				admin_url( 'edit.php' )
			)
		);
		exit;
	}

	/**
	 * Store generated bytes in the media library.
	 *
	 * @param string $bytes    Image bytes.
	 * @param string $filename File name.
	 * @param string $alt      Alt text.
	 * @return int Attachment ID, or 0.
	 */
	private static function attach( $bytes, $filename, $alt ) {
		if ( ! $bytes ) {
			return 0;
		}

		require_once ABSPATH . 'wp-admin/includes/image.php';

		$upload = wp_upload_bits( $filename, null, $bytes );

		if ( ! empty( $upload['error'] ) ) {
			return 0;
		}

		$id = wp_insert_attachment(
			array(
				'post_mime_type' => 'image/jpeg',
				'post_title'     => sanitize_text_field( $alt ),
				'post_status'    => 'inherit',
			),
			$upload['file']
		);

		if ( is_wp_error( $id ) || ! $id ) {
			return 0;
		}

		wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $upload['file'] ) );
		update_post_meta( $id, '_wp_attachment_image_alt', sanitize_text_field( $alt ) );

		return (int) $id;
	}

	/**
	 * Delete everything a previous import created.
	 */
	private static function remove() {
		$tracked = (array) get_option( self::TRACK, array() );

		foreach ( array( 'products', 'testimonials', 'attachments' ) as $group ) {
			foreach ( (array) ( $tracked[ $group ] ?? array() ) as $id ) {
				wp_delete_post( (int) $id, true );
			}
		}

		foreach ( (array) ( $tracked['terms'] ?? array() ) as $term_id ) {
			wp_delete_term( (int) $term_id, 'product_cat' );
		}

		foreach ( (array) ( $tracked['mods'] ?? array() ) as $mod ) {
			remove_theme_mod( $mod );
		}

		delete_option( self::TRACK );
	}

	/**
	 * Download one image into the media library.
	 *
	 * Photography is fetched rather than bundled: it keeps the plugin small
	 * and means the store ends up serving its own copies instead of
	 * hotlinking someone else's server. Results are cached per URL so a
	 * photograph shared between products is only fetched once.
	 *
	 * @param string $url Remote image URL.
	 * @param string $alt Alt text.
	 * @return int Attachment ID, or 0 when the download failed.
	 */
	private static function sideload( $url, $alt ) {
		static $seen = array();

		if ( isset( $seen[ $url ] ) ) {
			return $seen[ $url ];
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$tmp = download_url( $url, 25 );

		if ( is_wp_error( $tmp ) ) {
			$seen[ $url ] = 0;

			return 0;
		}

		// Unsplash serves query strings that are not filenames; give the file
		// a stable name derived from the photo id instead.
		$name = 'marketly-' . substr( md5( $url ), 0, 12 ) . '.jpg';

		$id = media_handle_sideload(
			array(
				'name'     => $name,
				'tmp_name' => $tmp,
			),
			0,
			$alt
		);

		if ( is_wp_error( $id ) ) {
			// download_url() created the temp file; media_handle_sideload
			// removes it on success but not on failure.
			wp_delete_file( $tmp );
			$seen[ $url ] = 0;

			return 0;
		}

		update_post_meta( $id, '_wp_attachment_image_alt', sanitize_text_field( $alt ) );
		$seen[ $url ] = (int) $id;

		return (int) $id;
	}

	/**
	 * An image for a product, falling back to drawn artwork.
	 *
	 * A store with no outbound network access, or a photograph that has since
	 * moved, must not stop the import — so a failed download is replaced by a
	 * generated placeholder rather than left empty.
	 *
	 * @param string $url   Remote image URL.
	 * @param string $alt   Alt text.
	 * @param array  $track Tracking array, by reference.
	 * @return int Attachment ID, or 0.
	 */
	private static function image( $url, $alt, &$track ) {
		$id = $url ? self::sideload( $url, $alt ) : 0;

		if ( ! $id ) {
			$id = self::attach(
				Marketly_Demo_Images::product( 'default', '#f2f4f8', '#c3ccda' ),
				'marketly-placeholder-' . sanitize_title( $alt ) . '.jpg',
				$alt
			);
		}

		if ( $id ) {
			$track['attachments'][] = $id;
		}

		return $id;
	}

	/**
	 * Build the catalogue.
	 *
	 * @return array Tracked ids.
	 */
	private static function import() {
		$tracked = array(
			'terms'        => array(),
			'products'     => array(),
			'testimonials' => array(),
			'attachments'  => array(),
			'mods'         => array(),
		);

		$term_ids = array();

		/* ------------------------------------------------ Categories */

		if ( taxonomy_exists( 'product_cat' ) ) {
			$order = 1;

			foreach ( marketly_demo_categories() as $category ) {
				$existing = term_exists( $category['slug'], 'product_cat' );
				$created  = $existing
					? $existing
					: wp_insert_term(
						$category['name'],
						'product_cat',
						array(
							'slug'        => $category['slug'],
							'description' => $category['description'],
						)
					);

				if ( is_wp_error( $created ) ) {
					continue;
				}

				$term_id                       = (int) ( is_array( $created ) ? $created['term_id'] : $created );
				$term_ids[ $category['name'] ] = $term_id;

				// Only track terms this import created, so removing the demo
				// never deletes a category the shop already had.
				if ( ! $existing ) {
					$tracked['terms'][] = $term_id;
				}

				$thumb = self::image(
					$category['image'],
					/* translators: %s: category name. */
					sprintf( __( '%s category', 'marketly-core' ), $category['name'] ),
					$tracked
				);

				if ( $thumb ) {
					update_term_meta( $term_id, 'thumbnail_id', $thumb );
				}

				update_term_meta( $term_id, 'order', $order );
				++$order;
			}
		}

		/* -------------------------------------------------- Products */

		$deal_id  = 0;
		$reviews  = marketly_demo_reviews();
		$fallback = array(
			array(
				'author' => 'Sam O.',
				'rating' => 5,
				'title'  => 'Exactly as described',
				'text'   => 'Arrived quickly and matches the photographs. No complaints at all.',
			),
			array(
				'author' => 'Nadia K.',
				'rating' => 5,
				'title'  => 'Better than expected',
				'text'   => 'The quality is a step above what I expected at this price. Would buy again.',
			),
			array(
				'author' => 'Tom B.',
				'rating' => 4,
				'title'  => 'Happy with it',
				'text'   => 'Does the job well. Took a day longer to arrive than I had hoped.',
			),
			array(
				'author' => 'Chloe M.',
				'rating' => 5,
				'title'  => 'Second one I have bought',
				'text'   => 'Bought one last year and came back for another. That says enough.',
			),
		);

		if ( class_exists( 'WC_Product_Simple' ) ) {
			foreach ( marketly_demo_products() as $index => $item ) {
				$product = new WC_Product_Simple();
				$product->set_name( $item['name'] );
				$product->set_slug( $item['slug'] );
				$product->set_status( 'publish' );
				$product->set_catalog_visibility( 'visible' );
				$product->set_sku( 'MKT-' . strtoupper( substr( md5( $item['ref'] ), 0, 6 ) ) );
				$product->set_regular_price( (string) $item['regular'] );

				if ( $item['price'] < $item['regular'] ) {
					$product->set_sale_price( (string) $item['price'] );
				}

				$product->set_short_description( $item['description'] );

				// Features read as a list on the product page, which is how the
				// reference application presents them.
				$body = '<p>' . esc_html( $item['description'] ) . '</p>';

				if ( $item['features'] ) {
					$body .= '<h3>' . esc_html__( 'Key features', 'marketly-core' ) . '</h3><ul>';

					foreach ( $item['features'] as $feature ) {
						$body .= '<li>' . esc_html( $feature ) . '</li>';
					}

					$body .= '</ul>';
				}

				$product->set_description( $body );
				$product->set_featured( (bool) $item['featured'] );
				$product->set_reviews_allowed( true );

				if ( $item['stock'] > 0 ) {
					$product->set_manage_stock( true );
					$product->set_stock_quantity( (int) $item['stock'] );
				}

				$product->set_stock_status( $item['stock'] > 0 ? 'instock' : 'outofstock' );

				if ( isset( $term_ids[ $item['category'] ] ) ) {
					$product->set_category_ids( array( $term_ids[ $item['category'] ] ) );
				}

				if ( $item['tags'] ) {
					$product->set_tag_ids( self::tag_ids( $item['tags'] ) );
				}

				// Brand, colourways, sizes and the specification table all
				// become product attributes, so they show in Additional
				// Information and can be filtered on.
				$attributes = array();

				if ( $item['brand'] ) {
					$attributes[ __( 'Brand', 'marketly-core' ) ] = array( $item['brand'] );
				}

				if ( $item['colors'] ) {
					$attributes[ __( 'Colour', 'marketly-core' ) ] = $item['colors'];
				}

				if ( $item['sizes'] ) {
					$attributes[ __( 'Size', 'marketly-core' ) ] = $item['sizes'];
				}

				foreach ( $item['specs'] as $label => $value ) {
					$attributes[ $label ] = array( $value );
				}

				if ( $attributes ) {
					$product->set_attributes( self::attributes( $attributes ) );
				}

				$product_id = $product->save();

				if ( ! $product_id ) {
					continue;
				}

				$tracked['products'][] = $product_id;

				$main = self::image( $item['image'], $item['name'], $tracked );

				if ( $main ) {
					set_post_thumbnail( $product_id, $main );
				}

				$gallery = array();

				foreach ( $item['gallery'] as $extra ) {
					$id = self::image( $extra, $item['name'], $tracked );

					if ( $id ) {
						$gallery[] = $id;
					}
				}

				if ( $gallery ) {
					update_post_meta( $product_id, '_product_image_gallery', implode( ',', $gallery ) );
				}

				// Best sellers are ordered on this, so it has to be real.
				update_post_meta( $product_id, 'total_sales', $item['best_seller'] ? 400 + ( 39 - $index ) * 12 : 20 + $index );

				self::add_reviews(
					$product_id,
					isset( $reviews[ $item['ref'] ] ) ? $reviews[ $item['ref'] ] : array_slice( $fallback, $index % 2, 2 + ( $index % 3 ) ),
					(float) $item['rating'],
					(int) $item['reviews']
				);

				if ( ! $deal_id && $item['flash_deal'] && $item['price'] < $item['regular'] ) {
					$deal_id = $product_id;
				}
			}
		}

		self::testimonials( $tracked );
		self::presentation( $tracked, $deal_id );

		update_option( self::TRACK, $tracked );

		if ( function_exists( 'wc_delete_product_transients' ) ) {
			wc_delete_product_transients();
		}

		return $tracked;
	}

	/**
	 * Resolve tag names to product_tag ids, creating any that are missing.
	 *
	 * @param string[] $names Tag names.
	 * @return int[]
	 */
	private static function tag_ids( $names ) {
		$ids = array();

		foreach ( $names as $name ) {
			$term = term_exists( $name, 'product_tag' );

			if ( ! $term ) {
				$term = wp_insert_term( $name, 'product_tag' );
			}

			if ( ! is_wp_error( $term ) ) {
				$ids[] = (int) ( is_array( $term ) ? $term['term_id'] : $term );
			}
		}

		return $ids;
	}

	/**
	 * Build WC_Product_Attribute objects from a label => values map.
	 *
	 * These are custom attributes rather than global taxonomies: a demo
	 * should not leave a shop with dozens of attribute taxonomies to clean up.
	 *
	 * @param array $map Label => array of values.
	 * @return WC_Product_Attribute[]
	 */
	private static function attributes( $map ) {
		$out      = array();
		$position = 0;

		foreach ( $map as $label => $values ) {
			$attribute = new WC_Product_Attribute();
			$attribute->set_name( $label );
			$attribute->set_options( (array) $values );
			$attribute->set_position( $position );
			$attribute->set_visible( true );
			$attribute->set_variation( false );

			$out[] = $attribute;
			++$position;
		}

		return $out;
	}

	/**
	 * Attach reviews to a product.
	 *
	 * The aggregate rating and count are written afterwards, so the card and
	 * the archive show the figures the reference design was drawn with while
	 * the Reviews tab still contains real, readable reviews.
	 *
	 * @param int   $product_id Product.
	 * @param array $entries    Reviews.
	 * @param float $rating     Aggregate rating to display.
	 * @param int   $count      Aggregate count to display.
	 */
	private static function add_reviews( $product_id, $entries, $rating, $count ) {
		foreach ( $entries as $i => $review ) {
			$comment_id = wp_insert_comment(
				array(
					'comment_post_ID'      => $product_id,
					'comment_author'       => $review['author'],
					'comment_author_email' => sanitize_title( $review['author'] ) . '@example.com',
					'comment_content'      => ( ! empty( $review['title'] ) ? $review['title'] . "\n\n" : '' ) . $review['text'],
					'comment_approved'     => 1,
					'comment_type'         => 'review',
					'comment_date'         => gmdate( 'Y-m-d H:i:s', time() - ( ( $i + 1 ) * DAY_IN_SECONDS * 4 ) ),
				)
			);

			if ( $comment_id ) {
				update_comment_meta( $comment_id, 'rating', (int) $review['rating'] );
				update_comment_meta( $comment_id, 'verified', 1 );
			}
		}

		if ( $rating > 0 ) {
			update_post_meta( $product_id, '_wc_average_rating', $rating );
		}

		if ( $count > 0 ) {
			update_post_meta( $product_id, '_wc_review_count', $count );
			update_post_meta(
				$product_id,
				'_wc_rating_count',
				array(
					5 => (int) round( $count * 0.8 ),
					4 => (int) round( $count * 0.2 ),
				)
			);
		}
	}

	/**
	 * Create the testimonial entries.
	 *
	 * @param array $tracked Tracking array, by reference.
	 */
	private static function testimonials( &$tracked ) {
		$people = array(
			array( 'Emily Johnson', 'Verified Buyer', 'Great products, fast delivery, and excellent customer service. Marketly is my go-to shopping destination.' ),
			array( 'Daniel Rivera', 'Verified Buyer', 'Ordered on Friday and it arrived Monday morning. Packaging was spotless and the price beat everywhere else I looked.' ),
			array( 'Priya Anand', 'Verified Buyer', 'Four orders in and returns have been painless every time. The support team actually replies, which is rarer than it should be.' ),
		);

		$avatars = array(
			'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
			'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
			'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
		);

		foreach ( $people as $order => $person ) {
			$id = wp_insert_post(
				array(
					'post_type'    => Marketly_Testimonials::POST_TYPE,
					'post_status'  => 'publish',
					'post_title'   => $person[0],
					'post_content' => $person[2],
					'menu_order'   => $order,
				)
			);

			if ( is_wp_error( $id ) || ! $id ) {
				continue;
			}

			$tracked['testimonials'][] = (int) $id;
			update_post_meta( $id, Marketly_Testimonials::META_ROLE, $person[1] );
			update_post_meta( $id, Marketly_Testimonials::META_RATE, 5 );

			$avatar = self::image( $avatars[ $order ], $person[0], $tracked );

			if ( $avatar ) {
				set_post_thumbnail( $id, $avatar );
			}
		}
	}

	/**
	 * Set the hero, banners and flash deal.
	 *
	 * @param array $tracked Tracking array, by reference.
	 * @param int   $deal_id Product for the flash deal.
	 */
	private static function presentation( &$tracked, $deal_id ) {
		$banners = array(
			'hero_image'   => array( 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80', __( 'A selection of products', 'marketly-core' ) ),
			'promo1_image' => array( 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=80', __( 'Summer collection', 'marketly-core' ) ),
			'promo2_image' => array( 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80', __( 'Home essentials', 'marketly-core' ) ),
		);

		foreach ( $banners as $mod => $banner ) {
			$id = self::image( $banner[0], $banner[1], $tracked );

			if ( $id ) {
				set_theme_mod( 'marketly_' . $mod, $id );
				$tracked['mods'][] = 'marketly_' . $mod;
			}
		}

		if ( $deal_id ) {
			set_theme_mod( 'marketly_deal_product', $deal_id );
			set_theme_mod( 'marketly_deal_ends', wp_date( 'Y-m-d H:i', time() + ( 3 * DAY_IN_SECONDS ) ) );
			$tracked['mods'][] = 'marketly_deal_product';
			$tracked['mods'][] = 'marketly_deal_ends';
		}

		$shop = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/' );

		foreach ( array( 'promo1_url', 'promo2_url' ) as $mod ) {
			set_theme_mod( 'marketly_' . $mod, $shop );
			$tracked['mods'][] = 'marketly_' . $mod;
		}
	}
}

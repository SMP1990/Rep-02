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
				<?php esc_html_e( 'Fills an empty store so you can see the design working: six product categories with images, twenty products with prices, sale prices, ratings and sales history, three customer reviews, and the homepage hero, banners and flash deal.', 'marketly-core' ); ?>
			</p>

			<p style="max-width:44em">
				<strong><?php esc_html_e( 'The artwork is generated placeholder illustration, not photography.', 'marketly-core' ); ?></strong>
				<?php esc_html_e( 'Replace it with your own product photos before going live.', 'marketly-core' ); ?>
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
	 * The demo catalogue.
	 *
	 * Kept as data so the import logic below stays readable. Sales figures are
	 * spread deliberately so the Best Sellers row draws from more than one
	 * category, and roughly three quarters of the range carries a sale price
	 * so the Deals page and the discount badges have something to show.
	 *
	 * @return array
	 */
	private static function catalogue() {
		return array(
			// Category slug, name, tint, subject colour, shape for the tile.
			'terms'    => array(
				array( 'Fashion', '#f6efe6', '#c8a678', 'garment' ),
				array( 'Electronics', '#eaeef7', '#5b6b86', 'slab' ),
				array( 'Beauty', '#fbecef', '#d1697f', 'tube' ),
				array( 'Home', '#f2f0ec', '#a89680', 'lamp' ),
				array( 'Grocery', '#eef4ea', '#7d9b5c', 'basket' ),
				array( 'Sports', '#ebeef2', '#4c5561', 'pair' ),
			),
			// Name, category, shape, tint, subject, regular, sale, sales, featured, blurb.
			'products' => array(
				array( 'Air Sneakers Running Shoes', 'Fashion', 'shoe', '#f4f6f9', '#dfe3ea', 79.99, 59.99, 320, true, 'Lightweight knit uppers and a cushioned midsole, built for daily miles.' ),
				array( 'Quilted Puffer Jacket', 'Fashion', 'garment', '#f7f2ea', '#c9a97c', 129.99, 89.99, 180, false, 'Recycled insulation with a water-repellent shell that packs into its own pocket.' ),
				array( 'Canvas Tote Bag', 'Fashion', 'basket', '#f6f3ec', '#bfae90', 39.99, 0, 95, false, 'Heavyweight organic cotton with reinforced handles and an inner pocket.' ),
				array( 'Polarised Sunglasses', 'Fashion', 'glasses', '#f2f4f8', '#3f4653', 89.99, 64.99, 210, false, 'Scratch-resistant polarised lenses in a lightweight acetate frame.' ),

				array( 'Premium Wireless Earbuds Pro', 'Electronics', 'pair', '#eef2f8', '#e8ecf2', 99.99, 69.99, 610, true, 'Active noise cancelling, 30-hour battery with the case, and a secure fit.' ),
				array( 'Smart Watch Series 8', 'Electronics', 'watch', '#eceff6', '#2b2f38', 249.99, 149.99, 430, true, 'Always-on display, heart-rate and sleep tracking, five-day battery.' ),
				array( 'Pro Max Smartphone 256GB', 'Electronics', 'slab', '#eaedf4', '#3a3f4a', 1299.99, 999.99, 980, false, 'Six-inch OLED, triple camera system and all-day battery in a titanium frame.' ),
				array( 'Ultrabook Air 13-inch', 'Electronics', 'laptop', '#edf0f6', '#7d879a', 1349.99, 1099.99, 870, false, 'Fanless, under a kilo, and eighteen hours of real-world battery life.' ),
				array( 'Studio Over-Ear Headphones', 'Electronics', 'orb', '#eff2f7', '#4a5160', 199.99, 149.99, 540, false, 'Closed-back studio monitoring with memory-foam cups and a detachable cable.' ),

				array( 'Matte Lipstick Collection', 'Beauty', 'tube', '#fbeef1', '#c9556e', 29.99, 19.99, 260, true, 'Six long-wear matte shades with a conditioning, non-drying formula.' ),
				array( 'Vitamin C Face Serum', 'Beauty', 'tube', '#fdf2e9', '#e0a24c', 44.99, 34.99, 300, false, 'Fifteen percent stabilised vitamin C with hyaluronic acid, for daily brightening.' ),
				array( 'Eau de Parfum 50ml', 'Beauty', 'tube', '#f7eff7', '#9b7fb0', 89.99, 0, 150, false, 'Bergamot, jasmine and cedar. Long-wearing without being loud.' ),

				array( 'Air Fryer 4.5L Digital', 'Home', 'orb', '#f1f2f4', '#3c4048', 99.99, 75.99, 740, false, 'Eight presets, a dishwasher-safe basket and no preheating.' ),
				array( 'Modern 3-Seater Fabric Sofa', 'Home', 'seat', '#f4f2ee', '#9a8f80', 379.99, 299.99, 500, false, 'Deep foam seats in a stain-resistant weave, with solid beech legs.' ),
				array( 'Ceramic Table Lamp', 'Home', 'lamp', '#f6f3ed', '#c2ab8a', 69.99, 49.99, 280, false, 'Hand-glazed ceramic base with a linen shade and an inline dimmer.' ),
				array( 'Non-Stick Cookware Set', 'Home', 'orb', '#f2f3f5', '#5a606b', 149.99, 119.99, 390, false, 'Five pans with a triple-layer non-stick coating, safe to 240C.' ),

				array( 'Single-Origin Coffee Beans 1kg', 'Grocery', 'basket', '#f1f0e9', '#7a5c3e', 34.99, 27.99, 620, false, 'Washed Ethiopian arabica, roasted for filter, shipped within days.' ),
				array( 'Organic Grocery Basket', 'Grocery', 'basket', '#eff4ea', '#89a86a', 49.99, 39.99, 120, false, 'A weekly box of seasonal organic fruit and vegetables from local growers.' ),

				array( 'Adjustable Dumbbell Set 20kg', 'Sports', 'pair', '#eef0f3', '#454b56', 159.99, 129.99, 150, false, 'Two handles and stackable plates replacing fifteen pairs of fixed weights.' ),
				array( 'Eco Yoga Mat 6mm', 'Sports', 'garment', '#eef3f1', '#6f9b8c', 49.99, 36.99, 340, false, 'Natural rubber with a closed-cell surface that grips when damp.' ),
			),
			// Name, label, quote, avatar tint, figure colour.
			'reviews'  => array(
				array( 'Emily Johnson', 'Verified Buyer', 'Great products, fast delivery, and excellent customer service. Marketly is my go-to shopping destination.', '#f6e6dc', '#c79b80' ),
				array( 'Daniel Rivera', 'Verified Buyer', 'Ordered on Friday and it arrived Monday morning. Packaging was spotless and the price beat everywhere else I looked.', '#e3ebf3', '#7d93ad' ),
				array( 'Priya Anand', 'Verified Buyer', 'Four orders in and returns have been painless every time. The support team actually replies, which is rarer than it should be.', '#efe7f4', '#a288b8' ),
			),
		);
	}

	/**
	 * A few short customer reviews, so ratings correspond to something real.
	 *
	 * @return array
	 */
	private static function review_lines() {
		return array(
			array( 'Sam O.', 5, 'Exactly as described and arrived quickly. No complaints at all.' ),
			array( 'Nadia K.', 5, 'Better quality than I expected for the price. Would buy again.' ),
			array( 'Tom B.', 4, 'Very happy with it. Took a day or two longer to arrive than I hoped.' ),
			array( 'Chloe M.', 5, 'Second one I have bought. Does the job perfectly.' ),
			array( 'Ravi S.', 4, 'Good value. The finish is nicer in person than in the photos.' ),
		);
	}

	/**
	 * Build the catalogue.
	 *
	 * @return array Tracked ids.
	 */
	private static function import() {
		$data    = self::catalogue();
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

			foreach ( $data['terms'] as $term ) {
				list( $name, $tint, $subject, $shape ) = $term;

				$existing = term_exists( $name, 'product_cat' );
				$created  = $existing ? $existing : wp_insert_term( $name, 'product_cat' );

				if ( is_wp_error( $created ) ) {
					continue;
				}

				$term_id           = (int) ( is_array( $created ) ? $created['term_id'] : $created );
				$term_ids[ $name ] = $term_id;

				// Only track terms this import actually created, so removal
				// never deletes a category the shop already had.
				if ( ! $existing ) {
					$tracked['terms'][] = $term_id;
				}

				$thumb = self::attach(
					Marketly_Demo_Images::product( $shape, $tint, $subject, 480 ),
					'marketly-cat-' . sanitize_title( $name ) . '.jpg',
					/* translators: %s: category name. */
					sprintf( __( '%s category', 'marketly-core' ), $name )
				);

				if ( $thumb ) {
					update_term_meta( $term_id, 'thumbnail_id', $thumb );
					$tracked['attachments'][] = $thumb;
				}

				// WooCommerce sorts category strips on this meta.
				update_term_meta( $term_id, 'order', $order );
				++$order;
			}
		}

		/* -------------------------------------------------- Products */

		$deal_id = 0;

		if ( class_exists( 'WC_Product_Simple' ) ) {
			$lines = self::review_lines();

			foreach ( $data['products'] as $index => $row ) {
				list( $name, $cat, $shape, $tint, $subject, $regular, $sale, $sales, $featured, $blurb ) = $row;

				$product = new WC_Product_Simple();
				$product->set_name( $name );
				$product->set_status( 'publish' );
				$product->set_catalog_visibility( 'visible' );
				$product->set_sku( 'MKT-' . str_pad( (string) ( $index + 1 ), 3, '0', STR_PAD_LEFT ) );
				$product->set_regular_price( (string) $regular );

				if ( $sale > 0 ) {
					$product->set_sale_price( (string) $sale );
				}

				$product->set_short_description( $blurb );
				$product->set_description(
					$blurb . ' ' . __( 'This is demo content created by the Marketly Core importer — replace the copy and the photograph with your own before launch.', 'marketly-core' )
				);
				$product->set_featured( (bool) $featured );
				$product->set_manage_stock( false );
				$product->set_stock_status( 'instock' );
				$product->set_reviews_allowed( true );

				if ( isset( $term_ids[ $cat ] ) ) {
					$product->set_category_ids( array( $term_ids[ $cat ] ) );
				}

				$product_id = $product->save();

				if ( ! $product_id ) {
					continue;
				}

				$tracked['products'][] = $product_id;

				$image = self::attach(
					Marketly_Demo_Images::product( $shape, $tint, $subject ),
					'marketly-' . sanitize_title( $name ) . '.jpg',
					$name
				);

				if ( $image ) {
					set_post_thumbnail( $product_id, $image );
					$tracked['attachments'][] = $image;
				}

				// Sales history is what the Best Sellers row orders on.
				update_post_meta( $product_id, 'total_sales', (int) $sales );

				// Real reviews, so the stars and the count agree with the
				// Reviews tab instead of being decorative numbers.
				$count = 3 + ( $index % 3 );

				for ( $i = 0; $i < $count; $i++ ) {
					$line       = $lines[ ( $index + $i ) % count( $lines ) ];
					$comment_id = wp_insert_comment(
						array(
							'comment_post_ID'      => $product_id,
							'comment_author'       => $line[0],
							'comment_author_email' => sanitize_title( $line[0] ) . '@example.com',
							'comment_content'      => $line[2],
							'comment_approved'     => 1,
							'comment_type'         => 'review',
							'comment_date'         => gmdate( 'Y-m-d H:i:s', time() - ( ( $i + 1 ) * DAY_IN_SECONDS * 3 ) ),
						)
					);

					if ( $comment_id ) {
						update_comment_meta( $comment_id, 'rating', (int) $line[1] );
						update_comment_meta( $comment_id, 'verified', 1 );
					}
				}

				if ( class_exists( 'WC_Comments' ) ) {
					WC_Comments::get_average_rating_for_product( wc_get_product( $product_id ) );
					WC_Comments::get_review_count_for_product( wc_get_product( $product_id ) );
				}

				// The flash deal wants a discounted product with a decent gap.
				if ( 'Smart Watch Series 8' === $name ) {
					$deal_id = $product_id;
				}
			}
		}

		/* ---------------------------------------------- Testimonials */

		foreach ( $data['reviews'] as $order => $review ) {
			list( $person, $label, $quote, $tint, $figure ) = $review;

			$id = wp_insert_post(
				array(
					'post_type'    => Marketly_Testimonials::POST_TYPE,
					'post_status'  => 'publish',
					'post_title'   => $person,
					'post_content' => $quote,
					'menu_order'   => $order,
				)
			);

			if ( is_wp_error( $id ) || ! $id ) {
				continue;
			}

			$tracked['testimonials'][] = (int) $id;

			update_post_meta( $id, Marketly_Testimonials::META_ROLE, $label );
			update_post_meta( $id, Marketly_Testimonials::META_RATE, 5 );

			$avatar = self::attach(
				Marketly_Demo_Images::avatar( $tint, $figure ),
				'marketly-avatar-' . sanitize_title( $person ) . '.jpg',
				$person
			);

			if ( $avatar ) {
				set_post_thumbnail( $id, $avatar );
				$tracked['attachments'][] = $avatar;
			}
		}

		/* ------------------------------------- Homepage presentation */

		$banners = array(
			'hero_image'   => array( '#eef3ff', '#dbe4fb', '#8aa4e8', __( 'A selection of products', 'marketly-core' ) ),
			'promo1_image' => array( '#f9b233', '#f5a623', '#ffffff', __( 'Summer collection', 'marketly-core' ) ),
			'promo2_image' => array( '#dbe7f5', '#cddcef', '#8fa3bd', __( 'Home essentials', 'marketly-core' ) ),
		);

		foreach ( $banners as $mod => $banner ) {
			$id = self::attach(
				Marketly_Demo_Images::banner( $banner[0], $banner[1], $banner[2] ),
				'marketly-' . str_replace( '_', '-', $mod ) . '.jpg',
				$banner[3]
			);

			if ( $id ) {
				set_theme_mod( 'marketly_' . $mod, $id );
				$tracked['attachments'][] = $id;
				$tracked['mods'][]        = 'marketly_' . $mod;
			}
		}

		if ( $deal_id ) {
			set_theme_mod( 'marketly_deal_product', $deal_id );
			// Three days out, so the countdown has something to count.
			set_theme_mod( 'marketly_deal_ends', wp_date( 'Y-m-d H:i', time() + ( 3 * DAY_IN_SECONDS ) ) );
			$tracked['mods'][] = 'marketly_deal_product';
			$tracked['mods'][] = 'marketly_deal_ends';
		}

		$shop = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/' );

		foreach ( array( 'promo1_url', 'promo2_url' ) as $mod ) {
			set_theme_mod( 'marketly_' . $mod, $shop );
			$tracked['mods'][] = 'marketly_' . $mod;
		}

		update_option( self::TRACK, $tracked );

		if ( function_exists( 'wc_delete_product_transients' ) ) {
			wc_delete_product_transients();
		}

		return $tracked;
	}
}

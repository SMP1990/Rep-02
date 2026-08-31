<?php
/**
 * The desktop navigation row.
 *
 * Hidden below the desktop breakpoint, where the hamburger drawer and the
 * fixed bottom tab bar carry navigation instead. The reference design has no
 * desktop row of its own, so this is derived from it: same tokens, same
 * spacing rhythm, with an "All Categories" entry mirroring the "All" tile.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;
?>
<nav class="nav-primary" aria-label="<?php esc_attr_e( 'Primary', 'marketly' ); ?>">
	<div class="container nav-primary__inner">

		<a class="nav-primary__all" href="<?php echo esc_url( marketly_shop_url() ); ?>">
			<?php marketly_icon( 'grid', array( 'size' => 17 ) ); ?>
			<?php esc_html_e( 'All Categories', 'marketly' ); ?>
		</a>

		<?php
		if ( has_nav_menu( 'primary' ) ) {
			wp_nav_menu(
				array(
					'theme_location' => 'primary',
					'container'      => false,
					'menu_class'     => 'nav-primary__list',
					'depth'          => 2,
					'fallback_cb'    => false,
				)
			);
		} else {
			// A sensible default before the owner builds a menu under
			// Appearance → Menus, so the row is never empty.
			$marketly_defaults = array(
				marketly_shop_url()               => __( 'Shop', 'marketly' ),
				marketly_page_url( 'deals' )      => __( 'Deals', 'marketly' ),
				marketly_page_url( 'wishlist' )   => __( 'Wishlist', 'marketly' ),
			);

			echo '<ul class="nav-primary__list">';

			foreach ( $marketly_defaults as $marketly_url => $marketly_label ) {
				if ( ! $marketly_url ) {
					continue;
				}

				printf(
					'<li class="menu-item"><a href="%1$s">%2$s</a></li>',
					esc_url( $marketly_url ),
					esc_html( $marketly_label )
				);
			}

			echo '</ul>';
		}
		?>
	</div>
</nav>

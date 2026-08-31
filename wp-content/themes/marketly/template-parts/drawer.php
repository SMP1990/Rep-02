<?php
/**
 * The off-canvas navigation drawer, opened by the hamburger.
 *
 * Rendered inert (hidden) on every page load; JavaScript opens it. With
 * scripting off the hamburger is hidden by CSS and the bottom tab bar plus
 * the footer menus carry navigation, so nothing becomes unreachable.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_menu    = has_nav_menu( 'mobile' ) ? 'mobile' : 'primary';
$marketly_socials = marketly_social_links();

// Utility links, minus anything the owner's own menu already links to, so the
// drawer never lists the same destination twice.
$marketly_taken = marketly_menu_urls( $marketly_menu );

$marketly_utility = array(
	array(
		'url'   => marketly_shop_url(),
		'icon'  => 'grid',
		'label' => __( 'All Categories', 'marketly' ),
	),
	array(
		'url'   => marketly_page_url( 'deals' ),
		'icon'  => 'tag',
		'label' => __( 'Deals', 'marketly' ),
	),
	array(
		'url'   => marketly_page_url( 'wishlist' ),
		'icon'  => 'heart',
		'label' => __( 'Wishlist', 'marketly' ),
	),
	array(
		'url'   => marketly_account_url(),
		'icon'  => 'user',
		'label' => __( 'Account', 'marketly' ),
	),
);

$marketly_utility = array_values(
	array_filter(
		$marketly_utility,
		static function ( $link ) use ( $marketly_taken ) {
			return ! empty( $link['url'] )
				&& ! in_array( untrailingslashit( strtok( $link['url'], '?#' ) ), $marketly_taken, true );
		}
	)
);
?>
<div class="drawer" id="marketly-drawer" hidden>
	<div class="drawer__backdrop" data-marketly-drawer-close></div>

	<div class="drawer__panel" role="dialog" aria-modal="true"
		aria-label="<?php esc_attr_e( 'Site menu', 'marketly' ); ?>">

		<div class="drawer__head">
			<?php marketly_brand( array( 'tagline' => false, 'class' => 'brand--sm' ) ); ?>

			<button type="button" class="btn btn--ghost btn--icon drawer__close" data-marketly-drawer-close>
				<?php marketly_icon( 'close', array( 'size' => 22 ) ); ?>
				<span class="screen-reader-text"><?php esc_html_e( 'Close menu', 'marketly' ); ?></span>
			</button>
		</div>

		<div class="drawer__body">
			<?php
			if ( has_nav_menu( $marketly_menu ) ) {
				wp_nav_menu(
					array(
						'theme_location' => $marketly_menu,
						'container'      => false,
						'menu_class'     => 'drawer__menu',
						'depth'          => 2,
						'fallback_cb'    => false,
					)
				);
			}
			?>

			<?php if ( $marketly_utility ) : ?>
				<ul class="drawer__links">
					<?php foreach ( $marketly_utility as $marketly_link ) : ?>
						<li>
							<a href="<?php echo esc_url( $marketly_link['url'] ); ?>">
								<?php marketly_icon( $marketly_link['icon'], array( 'size' => 19 ) ); ?>
								<?php echo esc_html( $marketly_link['label'] ); ?>
							</a>
						</li>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>

			<?php if ( $marketly_socials ) : ?>
				<div class="drawer__social">
					<?php foreach ( $marketly_socials as $marketly_social ) : ?>
						<a href="<?php echo esc_url( $marketly_social['url'] ); ?>"
							rel="noopener noreferrer" target="_blank">
							<?php marketly_icon( $marketly_social['icon'], array( 'size' => 19 ) ); ?>
							<span class="screen-reader-text"><?php echo esc_html( $marketly_social['label'] ); ?></span>
						</a>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>
		</div>
	</div>
</div>

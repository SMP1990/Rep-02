<?php
/**
 * The fixed bottom tab bar from the reference design.
 *
 * Shown on phones and tablets, hidden from the desktop breakpoint up where
 * the header's navigation row takes over.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_wishlist = marketly_page_url( 'wishlist' );
$marketly_deals    = marketly_page_url( 'deals' );
$marketly_shop     = marketly_shop_url();

// Which tab reads as current. Checked once here rather than inside the loop.
$marketly_is_shop = ( function_exists( 'is_shop' ) && is_shop() )
	|| is_post_type_archive( 'product' )
	|| is_tax( 'product_cat' )
	|| is_tax( 'product_tag' );

$marketly_tabs = array(
	array(
		'url'     => home_url( '/' ),
		'icon'    => 'home',
		'label'   => __( 'Home', 'marketly' ),
		'current' => is_front_page(),
	),
	array(
		'url'     => $marketly_shop,
		'icon'    => 'grid',
		'label'   => __( 'Categories', 'marketly' ),
		'current' => $marketly_is_shop,
	),
	array(
		'url'     => $marketly_deals,
		'icon'    => 'tag',
		'label'   => __( 'Deals', 'marketly' ),
		'current' => $marketly_deals && is_page( 'deals' ),
	),
	array(
		'url'     => $marketly_wishlist,
		'icon'    => 'heart',
		'label'   => __( 'Wishlist', 'marketly' ),
		'current' => $marketly_wishlist && is_page( 'wishlist' ),
		'count'   => true,
	),
	array(
		'url'     => marketly_account_url(),
		'icon'    => 'user',
		'label'   => __( 'Account', 'marketly' ),
		'current' => function_exists( 'is_account_page' ) && is_account_page(),
	),
);
?>
<nav class="tabbar" aria-label="<?php esc_attr_e( 'Quick navigation', 'marketly' ); ?>">
	<?php
	foreach ( $marketly_tabs as $marketly_tab ) :
		if ( empty( $marketly_tab['url'] ) ) {
			continue;
		}
		?>
		<a class="tabbar__item<?php echo $marketly_tab['current'] ? ' is-current' : ''; ?>"
			href="<?php echo esc_url( $marketly_tab['url'] ); ?>"
			<?php echo $marketly_tab['current'] ? ' aria-current="page"' : ''; ?>>

			<span class="tabbar__icon">
				<?php marketly_icon( $marketly_tab['icon'], array( 'size' => 21 ) ); ?>

				<?php if ( ! empty( $marketly_tab['count'] ) ) : ?>
					<span class="badge badge--count" data-marketly-wishlist-count hidden>0</span>
				<?php endif; ?>
			</span>

			<span class="tabbar__label"><?php echo esc_html( $marketly_tab['label'] ); ?></span>
		</a>
	<?php endforeach; ?>
</nav>

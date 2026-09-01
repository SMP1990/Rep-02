<?php
/**
 * Assembles the header, footer and the off-canvas furniture.
 *
 * Three actions are fired by header.php and footer.php, which hold no markup
 * of their own, so the pieces below can be reordered, removed or added to from
 * a child theme without touching a template file.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

/**
 * The announcement strip.
 */
function marketly_render_announcement() {
	get_template_part( 'template-parts/announcement' );
}
add_action( 'marketly_header', 'marketly_render_announcement', 10 );

/**
 * The brand, search and action row.
 */
function marketly_render_header_bar() {
	get_template_part( 'template-parts/header', 'bar' );
}
add_action( 'marketly_header', 'marketly_render_header_bar', 20 );

/**
 * The desktop navigation row.
 */
function marketly_render_nav_primary() {
	get_template_part( 'template-parts/nav', 'primary' );
}
add_action( 'marketly_header', 'marketly_render_nav_primary', 30 );

/**
 * The footer columns and legal bar.
 */
function marketly_render_footer() {
	get_template_part( 'template-parts/footer', 'main' );
}
add_action( 'marketly_footer', 'marketly_render_footer', 10 );

/**
 * The off-canvas drawer and the fixed bottom tab bar.
 *
 * Both live after the footer so they are last in the tab order, and neither
 * sits inside the main landmark.
 */
function marketly_render_offcanvas() {
	get_template_part( 'template-parts/drawer' );
	get_template_part( 'template-parts/nav', 'mobile-bar' );
}
add_action( 'marketly_after_footer', 'marketly_render_offcanvas', 10 );

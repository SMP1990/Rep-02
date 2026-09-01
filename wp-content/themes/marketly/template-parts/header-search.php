<?php
/**
 * The product search bar.
 *
 * One instance only. On phones flexbox wraps it onto its own full-width row
 * beneath the brand, exactly as the reference shows; from the desktop
 * breakpoint up the same element sits inline between the brand and the
 * action icons. Duplicating the markup per breakpoint would ship two search
 * fields, two labels and two ids to every visitor.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

if ( ! marketly_option( 'header_search' ) ) {
	return;
}
?>
<div class="header-search">
	<?php get_search_form( array( 'label' => __( 'Search products', 'marketly' ) ) ); ?>
</div>

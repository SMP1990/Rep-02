<?php
/**
 * The storefront homepage.
 *
 * Every section reads live data and removes itself when it has nothing to
 * show, so a brand-new store renders a coherent page rather than a column of
 * empty headings.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

get_header();

/**
 * The homepage sections.
 *
 * Hooked rather than listed inline so a child theme can reorder, remove or
 * insert a section without copying this template.
 */
do_action( 'marketly_homepage' );

get_footer();

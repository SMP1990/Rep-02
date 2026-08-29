<?php
/**
 * Home page — the six sections from the original single-page app, each now
 * server-rendered and each pulling live content from WordPress.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

get_header();

get_template_part( 'template-parts/section', 'hero' );
get_template_part( 'template-parts/section', 'stats' );
get_template_part( 'template-parts/section', 'featured' );
get_template_part( 'template-parts/section', 'why-choose-us' );
get_template_part( 'template-parts/section', 'about' );
get_template_part( 'template-parts/section', 'newsletter' );

get_footer();

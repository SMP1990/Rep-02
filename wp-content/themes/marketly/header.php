<?php
/**
 * Document head and the opening of the page shell.
 *
 * Phase 1 provides the shell only. The announcement bar, brand, search,
 * action icons and navigation are added in Phase 2.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<a class="skip-link screen-reader-text" href="#main"><?php esc_html_e( 'Skip to content', 'marketly' ); ?></a>

<div class="site" id="site">

	<header class="site-header" id="site-header">
		<?php
		/**
		 * Header contents.
		 *
		 * Phase 2 hooks the announcement bar, brand row, search and actions here.
		 */
		do_action( 'marketly_header' );
		?>
	</header>

	<main class="site-main" id="main" tabindex="-1">

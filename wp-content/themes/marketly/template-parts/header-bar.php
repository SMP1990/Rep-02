<?php
/**
 * The main header row: hamburger, brand, search and the action icons.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;
?>
<div class="header-bar">
	<div class="container header-bar__inner">

		<button type="button" class="hamburger" aria-expanded="false" aria-controls="marketly-drawer"
			data-marketly-drawer-open hidden>
			<?php marketly_icon( 'menu', array( 'size' => 24 ) ); ?>
			<span class="screen-reader-text"><?php esc_html_e( 'Open menu', 'marketly' ); ?></span>
		</button>

		<?php marketly_brand(); ?>

		<?php get_template_part( 'template-parts/header', 'search' ); ?>

		<?php get_template_part( 'template-parts/header', 'actions' ); ?>

	</div>
</div>

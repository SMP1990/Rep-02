<?php
/**
 * The empty state — shown when a loop finds nothing.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;
?>
<section class="empty-state">
	<span class="empty-state__icon" aria-hidden="true">
		<?php marketly_icon( 'search', array( 'size' => 32 ) ); ?>
	</span>

	<h2 class="empty-state__title"><?php esc_html_e( 'Nothing found', 'marketly' ); ?></h2>

	<p class="empty-state__text">
		<?php esc_html_e( 'We couldn’t find anything matching that. Try a different spelling or a broader term.', 'marketly' ); ?>
	</p>

	<div class="empty-state__search">
		<?php get_search_form(); ?>
	</div>
</section>

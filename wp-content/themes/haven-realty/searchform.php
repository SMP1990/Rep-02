<?php
/**
 * Search form.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;
?>
<form class="searchform" role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label class="screen-reader-text" for="haven-site-search"><?php esc_html_e( 'Search', 'haven' ); ?></label>
	<input
		type="search"
		id="haven-site-search"
		name="s"
		value="<?php echo esc_attr( get_search_query() ); ?>"
		placeholder="<?php esc_attr_e( 'Search…', 'haven' ); ?>"
	>
	<button class="btn btn--dark btn--sm" type="submit"><?php esc_html_e( 'Search', 'haven' ); ?></button>
</form>

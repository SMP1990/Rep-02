<?php
/**
 * The search form.
 *
 * Used by get_search_form() everywhere. The header's product search in Phase 2
 * reuses this markup with a modifier class.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_search_id = 'search-' . wp_unique_id();
?>
<form role="search" method="get" class="search-form" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label class="screen-reader-text" for="<?php echo esc_attr( $marketly_search_id ); ?>">
		<?php esc_html_e( 'Search for:', 'marketly' ); ?>
	</label>

	<div class="search-form__control">
		<span class="search-form__icon" aria-hidden="true">
			<?php marketly_icon( 'search', array( 'size' => 18 ) ); ?>
		</span>

		<input
			type="search"
			id="<?php echo esc_attr( $marketly_search_id ); ?>"
			class="search-form__input"
			name="s"
			value="<?php echo esc_attr( get_search_query() ); ?>"
			placeholder="<?php esc_attr_e( 'Search for products, brands and more...', 'marketly' ); ?>"
			autocomplete="off"
		>

		<button type="submit" class="search-form__submit btn btn--icon">
			<?php marketly_icon( 'search', array( 'size' => 20 ) ); ?>
			<span class="screen-reader-text"><?php esc_html_e( 'Search', 'marketly' ); ?></span>
		</button>
	</div>
</form>

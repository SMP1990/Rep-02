<?php
/**
 * The control that opens the filter panel on narrow screens.
 *
 * Only rendered where the panel is a drawer. On wide screens the panel is
 * already visible, so this button is hidden by the stylesheet rather than
 * left on the page as a control that does nothing.
 *
 * @param array $args state (array).
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_state  = isset( $args['state'] ) && is_array( $args['state'] ) ? $args['state'] : marketly_filter_state();
$marketly_active = marketly_filter_count_active( $marketly_state );
?>
<div class="cftrigger">
	<button type="button"
		class="btn btn--outline btn--sm cftrigger__btn"
		data-cf-open
		aria-expanded="false"
		aria-controls="marketly-filter-panel">
		<?php marketly_icon( 'sliders', array( 'size' => 16 ) ); ?>
		<span><?php esc_html_e( 'Filters', 'marketly' ); ?></span>
		<span class="cftrigger__badge" data-cf-badge<?php echo $marketly_active ? '' : ' hidden'; ?>><?php echo esc_html( number_format_i18n( $marketly_active ) ); ?></span>
	</button>
</div>

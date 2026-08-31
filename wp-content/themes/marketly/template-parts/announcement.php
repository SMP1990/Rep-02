<?php
/**
 * The announcement strip above the header.
 *
 * Renders nothing unless the owner has switched it on and written a message,
 * so an empty setting never leaves a stray coloured bar on the page.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

if ( ! marketly_announce_is_on() ) {
	return;
}

$marketly_text = trim( (string) marketly_option( 'announce_text' ) );
$marketly_url  = (string) marketly_option( 'announce_url' );
$marketly_tag  = $marketly_url ? 'a' : 'p';
?>
<div class="announce">
	<div class="container">
		<<?php echo esc_attr( $marketly_tag ); ?> class="announce__inner"
			<?php echo $marketly_url ? ' href="' . esc_url( $marketly_url ) . '"' : ''; ?>>
			<span class="announce__text"><?php echo esc_html( $marketly_text ); ?></span>

			<?php if ( $marketly_url ) : ?>
				<?php marketly_icon( 'chevron-right', array( 'size' => 15 ) ); ?>
			<?php endif; ?>
		</<?php echo esc_attr( $marketly_tag ); ?>>
	</div>
</div>

<?php
/**
 * The site footer.
 *
 * The reference design ends at the bottom tab bar and shows no footer, so
 * this is derived: the same tokens, spacing and icon set, carrying the brand,
 * the three footer menus, social links and the legal line.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_about   = trim( (string) marketly_option( 'footer_about' ) );
$marketly_socials = marketly_social_links();
$marketly_legal   = trim( (string) marketly_option( 'footer_copyright' ) );

if ( '' === $marketly_legal ) {
	$marketly_legal = sprintf(
		/* translators: 1: current year, 2: site name. */
		__( '© %1$s %2$s. All rights reserved.', 'marketly' ),
		gmdate( 'Y' ),
		get_bloginfo( 'name' )
	);
}

$marketly_columns = array( 'footer-1', 'footer-2', 'footer-3' );
?>
<div class="container footer__inner">

	<div class="footer__brand">
		<?php marketly_brand( array( 'tagline' => false, 'class' => 'brand--footer' ) ); ?>

		<?php if ( $marketly_about ) : ?>
			<p class="footer__about"><?php echo wp_kses_post( $marketly_about ); ?></p>
		<?php endif; ?>

		<?php if ( $marketly_socials ) : ?>
			<div class="footer__social">
				<?php foreach ( $marketly_socials as $marketly_social ) : ?>
					<a href="<?php echo esc_url( $marketly_social['url'] ); ?>"
						rel="noopener noreferrer" target="_blank">
						<?php marketly_icon( $marketly_social['icon'], array( 'size' => 18 ) ); ?>
						<span class="screen-reader-text"><?php echo esc_html( $marketly_social['label'] ); ?></span>
					</a>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>
	</div>

	<?php foreach ( $marketly_columns as $marketly_location ) : ?>
		<?php
		if ( ! has_nav_menu( $marketly_location ) ) {
			continue;
		}

		$marketly_obj  = get_registered_nav_menus();
		$marketly_name = isset( $marketly_obj[ $marketly_location ] ) ? $marketly_obj[ $marketly_location ] : '';
		$marketly_term = wp_get_nav_menu_object( get_nav_menu_locations()[ $marketly_location ] ?? 0 );
		$marketly_head = ( $marketly_term && ! empty( $marketly_term->name ) ) ? $marketly_term->name : $marketly_name;
		?>
		<nav class="footer__col" aria-label="<?php echo esc_attr( $marketly_head ); ?>">
			<h2 class="footer__col-title"><?php echo esc_html( $marketly_head ); ?></h2>

			<?php
			wp_nav_menu(
				array(
					'theme_location' => $marketly_location,
					'container'      => false,
					'menu_class'     => 'footer__menu',
					'depth'          => 1,
					'fallback_cb'    => false,
				)
			);
			?>
		</nav>
	<?php endforeach; ?>
</div>

<div class="footer__bar">
	<div class="container footer__bar-inner">
		<p class="footer__legal"><?php echo esc_html( $marketly_legal ); ?></p>

		<p class="footer__trust">
			<?php marketly_icon( 'shield', array( 'size' => 15 ) ); ?>
			<?php esc_html_e( 'Secure payments · 30-day returns', 'marketly' ); ?>
		</p>
	</div>
</div>

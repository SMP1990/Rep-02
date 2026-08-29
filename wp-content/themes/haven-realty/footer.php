<?php
/**
 * Site footer.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

$haven_socials = array(
	'facebook'  => get_theme_mod( 'haven_social_facebook', '' ),
	'instagram' => get_theme_mod( 'haven_social_instagram', '' ),
	'linkedin'  => get_theme_mod( 'haven_social_linkedin', '' ),
	'youtube'   => get_theme_mod( 'haven_social_youtube', '' ),
);

$haven_phone   = get_theme_mod( 'haven_contact_phone', '' );
$haven_email   = get_theme_mod( 'haven_contact_email', get_option( 'admin_email' ) );
$haven_address = get_theme_mod( 'haven_contact_address', '' );
?>
</main>

<footer class="site-footer">
	<div class="container">

		<div class="footer-grid">

			<div class="footer-brand">
				<?php haven_brand( 'light' ); ?>

				<p class="footer-brand__blurb">
					<?php
					echo esc_html(
						get_bloginfo( 'description' )
							? get_bloginfo( 'description' )
							: __( 'Opening doors to exceptional homes and a better lifestyle. Curating the world’s most prestigious architectural estates and premier urban residences.', 'haven' )
					);
					?>
				</p>

				<?php if ( array_filter( $haven_socials ) ) : ?>
					<ul class="socials">
						<?php foreach ( $haven_socials as $haven_network => $haven_url ) : ?>
							<?php if ( ! $haven_url ) { continue; } ?>
							<li>
								<a href="<?php echo esc_url( $haven_url ); ?>" rel="noopener noreferrer" target="_blank">
									<span class="screen-reader-text"><?php echo esc_html( ucfirst( $haven_network ) ); ?></span>
									<?php haven_the_icon( $haven_network ); ?>
								</a>
							</li>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>
			</div>

			<nav class="footer-col" aria-label="<?php esc_attr_e( 'Quick links', 'haven' ); ?>">
				<h2 class="footer-col__title"><?php esc_html_e( 'Quick Links', 'haven' ); ?></h2>
				<?php
				if ( has_nav_menu( 'footer' ) ) {
					wp_nav_menu(
						array(
							'theme_location' => 'footer',
							'container'      => false,
							'menu_class'     => 'footer-col__list',
							'depth'          => 1,
							'fallback_cb'    => false,
						)
					);
				} else {
					echo '<ul class="footer-col__list">';
					printf( '<li><a href="%s">%s</a></li>', esc_url( home_url( '/' ) ), esc_html__( 'Home', 'haven' ) );
					printf( '<li><a href="%s">%s</a></li>', esc_url( haven_archive_url() ), esc_html__( 'Properties', 'haven' ) );
					printf( '<li><a href="%s">%s</a></li>', esc_url( haven_filter_url( array( 'purpose' => 'for-sale' ) ) ), esc_html__( 'Buy', 'haven' ) );
					printf( '<li><a href="%s">%s</a></li>', esc_url( haven_filter_url( array( 'purpose' => 'for-rent' ) ) ), esc_html__( 'Rent', 'haven' ) );
					printf( '<li><a href="%s">%s</a></li>', esc_url( home_url( '/saved/' ) ), esc_html__( 'Saved Properties', 'haven' ) );
					printf( '<li><a href="%s">%s</a></li>', esc_url( home_url( '/contact/' ) ), esc_html__( 'Book a Consultation', 'haven' ) );
					echo '</ul>';
				}
				?>
			</nav>

			<nav class="footer-col" aria-label="<?php esc_attr_e( 'Property types', 'haven' ); ?>">
				<h2 class="footer-col__title"><?php esc_html_e( 'Explore', 'haven' ); ?></h2>
				<?php
				if ( has_nav_menu( 'legal' ) ) {
					wp_nav_menu(
						array(
							'theme_location' => 'legal',
							'container'      => false,
							'menu_class'     => 'footer-col__list',
							'depth'          => 1,
							'fallback_cb'    => false,
						)
					);
				} else {
					// Dynamic: reflects the property types actually in the catalog.
					$haven_types = get_terms(
						array(
							'taxonomy'   => 'property_type',
							'hide_empty' => true,
							'number'     => 6,
							'orderby'    => 'count',
							'order'      => 'DESC',
						)
					);

					echo '<ul class="footer-col__list">';

					if ( ! is_wp_error( $haven_types ) && $haven_types ) {
						foreach ( $haven_types as $haven_type ) {
							printf(
								'<li><a href="%s">%s</a></li>',
								esc_url( (string) get_term_link( $haven_type ) ),
								esc_html( $haven_type->name )
							);
						}
					} else {
						printf( '<li><a href="%s">%s</a></li>', esc_url( haven_archive_url() ), esc_html__( 'All Properties', 'haven' ) );
					}

					echo '</ul>';
				}
				?>
			</nav>

			<div class="footer-col">
				<h2 class="footer-col__title"><?php esc_html_e( 'Contact Us', 'haven' ); ?></h2>
				<ul class="footer-contact">
					<?php if ( $haven_address ) : ?>
						<li>
							<?php haven_the_icon( 'map-pin', 'icon--gold' ); ?>
							<span><?php echo esc_html( $haven_address ); ?></span>
						</li>
					<?php endif; ?>

					<?php if ( $haven_phone ) : ?>
						<li>
							<?php haven_the_icon( 'phone', 'icon--gold' ); ?>
							<a href="tel:<?php echo esc_attr( preg_replace( '/[^0-9+]/', '', $haven_phone ) ); ?>"><?php echo esc_html( $haven_phone ); ?></a>
						</li>
					<?php endif; ?>

					<?php if ( $haven_email ) : ?>
						<li>
							<?php haven_the_icon( 'mail', 'icon--gold' ); ?>
							<a href="mailto:<?php echo esc_attr( $haven_email ); ?>"><?php echo esc_html( $haven_email ); ?></a>
						</li>
					<?php endif; ?>
				</ul>
			</div>

		</div>

		<div class="footer-bottom">
			<p>
				<?php
				printf(
					/* translators: 1: year, 2: site name */
					esc_html__( '© %1$s %2$s. All rights reserved. Equal Housing Opportunity.', 'haven' ),
					esc_html( gmdate( 'Y' ) ),
					esc_html( get_bloginfo( 'name' ) )
				);
				?>
			</p>

			<a class="footer-top-link" href="#site-header">
				<?php esc_html_e( 'Back to top', 'haven' ); ?>
				<?php haven_the_icon( 'arrow-up' ); ?>
			</a>
		</div>

	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>

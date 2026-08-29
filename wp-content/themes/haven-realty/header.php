<?php
/**
 * Site header: announcement bar, brand, primary navigation, actions.
 *
 * @package Haven
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

<a class="skip-link screen-reader-text" href="#main"><?php esc_html_e( 'Skip to content', 'haven' ); ?></a>

<header class="site-header" id="site-header">

	<?php
	$announcement = get_theme_mod( 'haven_announcement', '' );
	$phone        = get_theme_mod( 'haven_contact_phone', '' );

	if ( $announcement || $phone ) :
		?>
		<div class="announce">
			<div class="container announce__inner">
				<?php if ( $announcement ) : ?>
					<p class="announce__text">
						<span class="announce__dot" aria-hidden="true"></span>
						<?php echo esc_html( $announcement ); ?>
					</p>
				<?php endif; ?>

				<?php if ( $phone ) : ?>
					<p class="announce__phone">
						<span class="announce__sep" aria-hidden="true">|</span>
						<?php esc_html_e( 'Direct Concierge:', 'haven' ); ?>
						<a href="tel:<?php echo esc_attr( preg_replace( '/[^0-9+]/', '', $phone ) ); ?>"><?php echo esc_html( $phone ); ?></a>
					</p>
				<?php endif; ?>
			</div>
		</div>
	<?php endif; ?>

	<div class="container navbar">
		<?php haven_brand( 'dark' ); ?>

		<nav class="nav-primary" aria-label="<?php esc_attr_e( 'Primary', 'haven' ); ?>">
			<?php
			if ( has_nav_menu( 'primary' ) ) {
				wp_nav_menu(
					array(
						'theme_location' => 'primary',
						'container'      => false,
						'menu_class'     => 'nav-primary__list',
						'depth'          => 2,
						'fallback_cb'    => false,
					)
				);
			} else {
				// Sensible default before the owner builds a menu in Appearance → Menus.
				echo '<ul class="nav-primary__list">';
				printf(
					'<li class="%1$s"><a href="%2$s">%3$s</a></li>',
					esc_attr( is_front_page() ? 'current-menu-item' : '' ),
					esc_url( home_url( '/' ) ),
					esc_html__( 'Home', 'haven' )
				);
				printf(
					'<li class="%1$s"><a href="%2$s">%3$s</a></li>',
					esc_attr( haven_is_property_archive() ? 'current-menu-item' : '' ),
					esc_url( haven_archive_url() ),
					esc_html__( 'Properties', 'haven' )
				);
				printf(
					'<li><a href="%1$s">%2$s</a></li>',
					esc_url( haven_filter_url( array( 'purpose' => 'for-sale' ) ) ),
					esc_html__( 'Buy', 'haven' )
				);
				printf(
					'<li><a href="%1$s">%2$s</a></li>',
					esc_url( haven_filter_url( array( 'purpose' => 'for-rent' ) ) ),
					esc_html__( 'Rent', 'haven' )
				);
				echo '</ul>';
			}
			?>
		</nav>

		<div class="navbar__actions">
			<a class="btn-icon" href="<?php echo esc_url( home_url( '/saved/' ) ); ?>" aria-label="<?php esc_attr_e( 'Saved properties', 'haven' ); ?>">
				<?php haven_the_icon( 'heart', 'icon--gold' ); ?>
				<span class="btn-icon__badge" data-haven-fav-count hidden>0</span>
			</a>

			<a class="btn btn--dark navbar__cta" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">
				<?php esc_html_e( 'Book a Consultation', 'haven' ); ?>
			</a>

			<button
				class="navbar__toggle"
				type="button"
				aria-expanded="false"
				aria-controls="mobile-menu"
				data-haven-menu-toggle
			>
				<span class="screen-reader-text"><?php esc_html_e( 'Toggle menu', 'haven' ); ?></span>
				<?php haven_the_icon( 'menu', 'navbar__toggle-open' ); ?>
				<?php haven_the_icon( 'close', 'navbar__toggle-close' ); ?>
			</button>
		</div>
	</div>

	<div class="mobile-menu" id="mobile-menu" hidden>
		<div class="container">
			<?php
			if ( has_nav_menu( 'primary' ) ) {
				wp_nav_menu(
					array(
						'theme_location' => 'primary',
						'container'      => false,
						'menu_class'     => 'mobile-menu__list',
						'depth'          => 2,
						'fallback_cb'    => false,
					)
				);
			}
			?>

			<div class="mobile-menu__actions">
				<a class="btn btn--outline" href="<?php echo esc_url( haven_archive_url() ); ?>">
					<?php esc_html_e( 'Browse Properties', 'haven' ); ?>
				</a>
				<a class="btn btn--dark" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">
					<?php esc_html_e( 'Book a Consultation', 'haven' ); ?>
				</a>
			</div>
		</div>
	</div>

</header>

<main class="site-main" id="main">
	<?php haven_form_notice(); ?>

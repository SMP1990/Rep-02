<?php
/**
 * Template Name: Saved Properties
 *
 * Favorites without accounts: the IDs live in the visitor's own localStorage,
 * and this page asks the REST endpoint to render those listings as the same
 * cards used everywhere else. Nothing personal is stored on the server, so
 * there is no login, no profile and no privacy surface.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<div class="page-single">

	<header class="page-hero">
		<div class="container">
			<p class="eyebrow eyebrow--light"><?php esc_html_e( 'Your Shortlist', 'haven' ); ?></p>
			<h1 class="page-hero__title"><?php the_title(); ?></h1>
			<p class="page-hero__lede">
				<?php esc_html_e( 'Properties you saved on this device. Nothing is shared with us until you send an inquiry.', 'haven' ); ?>
			</p>
		</div>
	</header>

	<div class="container">
		<?php
		while ( have_posts() ) :
			the_post();

			if ( get_the_content() ) :
				?>
				<div class="prose"><?php the_content(); ?></div>
				<?php
			endif;
		endwhile;
		?>

		<div class="saved" data-haven-saved>
			<div class="card-grid" data-haven-saved-grid hidden></div>

			<div class="empty-state" data-haven-saved-empty>
				<span class="empty-state__icon"><?php haven_the_icon( 'heart' ); ?></span>
				<h2 class="empty-state__title"><?php esc_html_e( 'Nothing saved yet', 'haven' ); ?></h2>
				<p class="empty-state__body">
					<?php esc_html_e( 'Tap the heart on any listing to keep it here for later.', 'haven' ); ?>
				</p>
				<a class="btn btn--dark" href="<?php echo esc_url( haven_archive_url() ); ?>">
					<span><?php esc_html_e( 'Browse Properties', 'haven' ); ?></span>
					<?php haven_the_icon( 'arrow-right', 'icon--gold' ); ?>
				</a>
			</div>

			<noscript>
				<div class="empty-state">
					<h2 class="empty-state__title"><?php esc_html_e( 'JavaScript required', 'haven' ); ?></h2>
					<p class="empty-state__body">
						<?php esc_html_e( 'Saved properties are stored in your browser, so this page needs JavaScript enabled. Everything else on the site works without it.', 'haven' ); ?>
					</p>
				</div>
			</noscript>
		</div>
	</div>

</div>

<?php
get_footer();

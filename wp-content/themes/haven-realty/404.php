<?php
/**
 * 404 — styled, with real routes out rather than a dead end.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<div class="archive">
	<div class="container">
		<div class="empty-state empty-state--page">
			<p class="eyebrow"><?php esc_html_e( 'Error 404', 'haven' ); ?></p>
			<h1 class="empty-state__title"><?php esc_html_e( 'This address doesn’t exist', 'haven' ); ?></h1>
			<p class="empty-state__body">
				<?php esc_html_e( 'The page you were looking for has moved or was never here. The full portfolio is one click away.', 'haven' ); ?>
			</p>

			<p class="empty-state__actions">
				<a class="btn btn--dark" href="<?php echo esc_url( haven_archive_url() ); ?>">
					<span><?php esc_html_e( 'Browse Properties', 'haven' ); ?></span>
					<?php haven_the_icon( 'arrow-right', 'icon--gold' ); ?>
				</a>
				<a class="btn btn--outline" href="<?php echo esc_url( home_url( '/' ) ); ?>">
					<?php esc_html_e( 'Back to Home', 'haven' ); ?>
				</a>
			</p>
		</div>
	</div>
</div>

<?php
get_footer();

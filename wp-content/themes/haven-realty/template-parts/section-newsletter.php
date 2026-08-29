<?php
/**
 * Newsletter signup — posts to admin-post.php, stores a subscriber lead.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;
?>

<section class="section section--newsletter">
	<div class="container">
		<div class="newsletter">

			<div class="newsletter__intro">
				<span class="newsletter__icon"><?php haven_the_icon( 'mail' ); ?></span>

				<div>
					<h2 class="newsletter__title"><?php esc_html_e( 'Stay Updated with New Listings and Market Insights', 'haven' ); ?></h2>
					<p class="newsletter__lede"><?php esc_html_e( 'Subscribe to get exclusive off-market updates straight to your inbox.', 'haven' ); ?></p>
				</div>
			</div>

			<form class="newsletter__form" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
				<input type="hidden" name="action" value="haven_newsletter">
				<input type="hidden" name="source_url" value="<?php echo esc_url( haven_canonical_url() ); ?>">
				<?php wp_nonce_field( 'haven_newsletter', 'haven_nonce' ); ?>

				<p class="honeypot" aria-hidden="true">
					<label for="haven-website-news"><?php esc_html_e( 'Leave this field empty', 'haven' ); ?></label>
					<input type="text" id="haven-website-news" name="haven_website" tabindex="-1" autocomplete="off">
				</p>

				<label class="screen-reader-text" for="haven-newsletter-email"><?php esc_html_e( 'Email address', 'haven' ); ?></label>
				<input
					id="haven-newsletter-email"
					type="email"
					name="email"
					required
					autocomplete="email"
					placeholder="<?php esc_attr_e( 'Enter your email', 'haven' ); ?>"
				>

				<button class="btn btn--gold" type="submit"><?php esc_html_e( 'Subscribe', 'haven' ); ?></button>
			</form>

		</div>
	</div>
</section>

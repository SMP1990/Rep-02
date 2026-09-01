<?php
/**
 * Comments for posts and pages.
 *
 * WooCommerce renders product reviews through its own template, so this only
 * covers editorial content.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

// Never expose comments on a password-protected post to someone without it.
if ( post_password_required() ) {
	return;
}
?>
<section id="comments" class="comments">

	<?php if ( have_comments() ) : ?>
		<h2 class="comments__title">
			<?php
			$marketly_count = (int) get_comments_number();
			printf(
				/* translators: %s: comment count. */
				esc_html( _n( '%s comment', '%s comments', $marketly_count, 'marketly' ) ),
				esc_html( number_format_i18n( $marketly_count ) )
			);
			?>
		</h2>

		<ol class="comments__list">
			<?php
			wp_list_comments(
				array(
					'style'       => 'ol',
					'short_ping'  => true,
					'avatar_size' => 44,
				)
			);
			?>
		</ol>

		<?php
		the_comments_navigation(
			array(
				'prev_text' => esc_html__( 'Older comments', 'marketly' ),
				'next_text' => esc_html__( 'Newer comments', 'marketly' ),
			)
		);
		?>

		<?php if ( ! comments_open() ) : ?>
			<p class="comments__closed"><?php esc_html_e( 'Comments are closed.', 'marketly' ); ?></p>
		<?php endif; ?>
	<?php endif; ?>

	<?php
	comment_form(
		array(
			'class_submit'         => 'btn',
			'title_reply'          => esc_html__( 'Leave a comment', 'marketly' ),
			'comment_notes_before' => '',
		)
	);
	?>
</section>

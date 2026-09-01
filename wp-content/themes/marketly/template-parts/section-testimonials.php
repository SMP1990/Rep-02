<?php
/**
 * Customer testimonials.
 *
 * A scroll-snap rail with dot controls, so it works by swipe, by keyboard and
 * with JavaScript off — the dots simply become inert links to each slide.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_items = marketly_get_testimonials( 6 );

if ( ! $marketly_items ) {
	return;
}

$marketly_uid = wp_unique_id( 'tm-' );
?>
<section class="section testimonials" aria-labelledby="testimonials-title">
	<div class="container">
		<h2 class="screen-reader-text" id="testimonials-title">
			<?php esc_html_e( 'What our customers say', 'marketly' ); ?>
		</h2>

		<?php
		// tabindex makes the rail scrollable by keyboard. Its children are
		// quotes, not links, so without it there is nothing to tab to and the
		// second and third reviews are unreachable without a pointer.
		?>
		<div class="tmrail" data-marketly-testimonials tabindex="0" role="group"
			aria-label="<?php esc_attr_e( 'Customer reviews', 'marketly' ); ?>">
			<?php foreach ( $marketly_items as $marketly_i => $marketly_item ) : ?>
				<?php
				$marketly_role   = (string) get_post_meta( $marketly_item->ID, '_marketly_role', true );
				$marketly_rating = (int) get_post_meta( $marketly_item->ID, '_marketly_rating', true );
				$marketly_quote  = wp_strip_all_tags( (string) $marketly_item->post_content );
				?>
				<figure class="card tmcard" id="<?php echo esc_attr( $marketly_uid . '-' . $marketly_i ); ?>">
					<div class="tmcard__who">
						<?php if ( has_post_thumbnail( $marketly_item ) ) : ?>
							<?php
							echo get_the_post_thumbnail(
								$marketly_item,
								'thumbnail',
								array(
									'class'   => 'tmcard__avatar',
									'loading' => 'lazy',
									'alt'     => '',
								)
							);
							?>
						<?php endif; ?>

						<figcaption class="tmcard__meta">
							<span class="tmcard__name"><?php echo esc_html( get_the_title( $marketly_item ) ); ?></span>

							<?php if ( $marketly_role ) : ?>
								<span class="tmcard__role"><?php echo esc_html( $marketly_role ); ?></span>
							<?php endif; ?>
						</figcaption>
					</div>

					<blockquote class="tmcard__quote">
						<?php if ( $marketly_rating ) : ?>
							<?php marketly_rating_stars( $marketly_rating ); ?>
						<?php endif; ?>

						<p>“<?php echo esc_html( $marketly_quote ); ?>”</p>
					</blockquote>
				</figure>
			<?php endforeach; ?>
		</div>

		<?php if ( count( $marketly_items ) > 1 ) : ?>
			<?php
			// Plain buttons, not a tablist: there are no tab panels here, only
			// a scrolling group, and role="tab" without role="tabpanel"
			// promises a relationship the markup does not have.
			?>
			<div class="tmdots" role="group" aria-label="<?php esc_attr_e( 'Choose a review', 'marketly' ); ?>">
				<?php foreach ( $marketly_items as $marketly_i => $marketly_item ) : ?>
					<button type="button" class="tmdot<?php echo 0 === $marketly_i ? ' is-current' : ''; ?>"
						<?php echo 0 === $marketly_i ? ' aria-current="true"' : ''; ?>
						data-marketly-tmdot="<?php echo esc_attr( (string) $marketly_i ); ?>">
						<span class="screen-reader-text">
							<?php
							printf(
								/* translators: %d: review number. */
								esc_html__( 'Review %d', 'marketly' ),
								(int) $marketly_i + 1
							);
							?>
						</span>
					</button>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>
	</div>
</section>

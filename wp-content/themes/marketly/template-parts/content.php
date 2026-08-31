<?php
/**
 * A post in a list.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;
?>
<article id="post-<?php the_ID(); ?>" <?php post_class( 'card post-card' ); ?>>
	<?php if ( has_post_thumbnail() ) : ?>
		<a class="post-card__media" href="<?php the_permalink(); ?>" tabindex="-1" aria-hidden="true">
			<?php
			the_post_thumbnail(
				'marketly-card',
				array(
					'loading' => 'lazy',
					'class'   => 'post-card__img',
				)
			);
			?>
		</a>
	<?php endif; ?>

	<div class="post-card__body">
		<h2 class="post-card__title">
			<a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
		</h2>

		<p class="post-card__meta">
			<time datetime="<?php echo esc_attr( get_the_date( DATE_W3C ) ); ?>">
				<?php echo esc_html( get_the_date() ); ?>
			</time>
		</p>

		<p class="post-card__excerpt"><?php echo esc_html( get_the_excerpt() ); ?></p>
	</div>
</article>

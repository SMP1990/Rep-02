<?php
/**
 * Text summary for a non-property entry.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;
?>
<article <?php post_class( 'entry' ); ?>>
	<?php if ( has_post_thumbnail() ) : ?>
		<a class="entry__media" href="<?php the_permalink(); ?>" tabindex="-1" aria-hidden="true">
			<?php the_post_thumbnail( 'haven-card', array( 'sizes' => '(max-width: 640px) 92vw, 360px' ) ); ?>
		</a>
	<?php endif; ?>

	<div class="entry__body">
		<h2 class="entry__title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
		<p class="entry__meta"><?php echo esc_html( get_the_date() ); ?></p>
		<p class="entry__excerpt"><?php echo esc_html( get_the_excerpt() ); ?></p>
		<a class="link-arrow" href="<?php the_permalink(); ?>">
			<span><?php esc_html_e( 'Read more', 'haven' ); ?></span>
			<?php haven_the_icon( 'arrow-right', 'icon--gold' ); ?>
		</a>
	</div>
</article>

<?php
/**
 * A single search result.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;
?>
<article id="post-<?php the_ID(); ?>" <?php post_class( 'card search-result' ); ?>>
	<h2 class="search-result__title">
		<a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
	</h2>

	<p class="search-result__url"><?php echo esc_html( get_permalink() ); ?></p>
	<p class="search-result__excerpt"><?php echo esc_html( get_the_excerpt() ); ?></p>
</article>

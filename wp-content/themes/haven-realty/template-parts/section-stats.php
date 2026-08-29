<?php
/**
 * Stats ribbon — dark card with the monogram watermark.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

$haven_icons = array( 1 => 'award', 2 => 'trending', 3 => 'check-circle', 4 => 'dollar' );
$haven_stats = array();

foreach ( $haven_icons as $haven_index => $haven_icon ) {
	$haven_value = get_theme_mod( "haven_stat_{$haven_index}_value", '' );
	$haven_label = get_theme_mod( "haven_stat_{$haven_index}_label", '' );

	if ( $haven_value && $haven_label ) {
		$haven_stats[] = array(
			'value' => $haven_value,
			'label' => $haven_label,
			'icon'  => $haven_icon,
		);
	}
}

if ( ! $haven_stats ) {
	return;
}

$haven_word = get_theme_mod( 'haven_brand_word', get_bloginfo( 'name' ) );
?>

<section class="stats">
	<div class="container">
		<div class="stats__card">
			<span class="stats__watermark" aria-hidden="true"><?php echo esc_html( mb_substr( $haven_word, 0, 1 ) ); ?></span>

			<ul class="stats__grid">
				<?php foreach ( $haven_stats as $haven_stat ) : ?>
					<li class="stats__item">
						<span class="stats__value">
							<?php haven_the_icon( $haven_stat['icon'], 'icon--gold' ); ?>
							<span><?php echo esc_html( $haven_stat['value'] ); ?></span>
						</span>
						<span class="stats__label"><?php echo esc_html( $haven_stat['label'] ); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
	</div>
</section>

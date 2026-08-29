<?php
/**
 * Mortgage estimator.
 *
 * Renders a server-computed default payment so the panel is meaningful with
 * JavaScript disabled; the sliders then recalculate live in the browser.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

$haven_price = isset( $args['price'] ) ? (float) $args['price'] : 0;

if ( $haven_price <= 0 ) {
	return;
}

$haven_currency = haven_currency();
?>

<section
	class="mortgage"
	data-haven-mortgage
	data-price="<?php echo esc_attr( $haven_price ); ?>"
	data-symbol="<?php echo esc_attr( $haven_currency['symbol'] ); ?>"
>
	<header class="mortgage__head">
		<span class="mortgage__icon"><?php haven_the_icon( 'calculator' ); ?></span>
		<div>
			<h2 class="mortgage__title"><?php esc_html_e( 'Mortgage Calculator', 'haven' ); ?></h2>
			<p class="mortgage__lede"><?php esc_html_e( 'Estimate your monthly financing commitment.', 'haven' ); ?></p>
		</div>
	</header>

	<div class="mortgage__controls">
		<p class="field">
			<label for="haven-down">
				<?php esc_html_e( 'Down Payment', 'haven' ); ?>
				<output data-haven-down-label>20%</output>
			</label>
			<input type="range" id="haven-down" min="5" max="60" step="5" value="20" data-haven-down>
			<span class="field__hint" data-haven-down-amount></span>
		</p>

		<p class="field">
			<label for="haven-rate">
				<?php esc_html_e( 'Interest Rate', 'haven' ); ?>
				<output data-haven-rate-label>6.5%</output>
			</label>
			<input type="range" id="haven-rate" min="2" max="12" step="0.25" value="6.5" data-haven-rate>
			<span class="field__hint"><?php esc_html_e( 'Annual percentage rate', 'haven' ); ?></span>
		</p>

		<p class="field">
			<label for="haven-term"><?php esc_html_e( 'Loan Term', 'haven' ); ?></label>
			<select id="haven-term" data-haven-term>
				<option value="15"><?php esc_html_e( '15 Years Fixed', 'haven' ); ?></option>
				<option value="30" selected><?php esc_html_e( '30 Years Fixed', 'haven' ); ?></option>
			</select>
		</p>
	</div>

	<div class="mortgage__result">
		<div>
			<p class="mortgage__result-label"><?php esc_html_e( 'Estimated Payment', 'haven' ); ?></p>
			<p class="mortgage__amount">
				<span data-haven-monthly><?php
					// Server-side default: 20% down, 6.5% APR, 30 years.
					$haven_principal = $haven_price * 0.8;
					$haven_monthly_r = 0.065 / 12;
					$haven_n         = 360;
					$haven_payment   = $haven_principal * $haven_monthly_r / ( 1 - pow( 1 + $haven_monthly_r, -$haven_n ) );

					echo esc_html( haven_format_price( round( $haven_payment ) ) );
				?></span>
				<span class="mortgage__per"><?php esc_html_e( '/ mo', 'haven' ); ?></span>
			</p>
		</div>

		<p class="mortgage__note">
			<?php esc_html_e( 'Principal and interest only. Taxes, insurance and association dues are not included.', 'haven' ); ?>
		</p>
	</div>
</section>

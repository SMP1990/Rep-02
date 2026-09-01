<?php
/**
 * The catalogue filter panel.
 *
 * A single <form method="get"> containing every control. That is what makes
 * the panel work without JavaScript: pressing Enter, or the "Show results"
 * button, submits the whole state to the catalogue URL and the server
 * renders the filtered page. The script intercepts the same form and swaps
 * the results in place instead.
 *
 * The panel is one component in three placements:
 *
 *   page — a sidebar on wide screens, a drawer below 1024px. The drawer is
 *          the same element: CSS moves it off-canvas, it is not a copy.
 *   sync — the same panel re-rendered by the endpoint so its counts match
 *          the results that were just applied.
 *   home — the compact horizontal strip on the storefront.
 *
 * @param array $args state (array), mode (page|sync|home), base (string).
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

$marketly_state = isset( $args['state'] ) && is_array( $args['state'] )
	? $args['state']
	: marketly_filter_state();

$marketly_mode = isset( $args['mode'] ) && in_array( $args['mode'], array( 'page', 'sync', 'home' ), true )
	? $args['mode']
	: 'page';

$marketly_base   = isset( $args['base'] ) ? (string) $args['base'] : marketly_filter_base_url();
$marketly_facets = marketly_filter_facets( $marketly_state );
$marketly_active = marketly_filter_count_active( $marketly_state );
$marketly_bounds = $marketly_facets['bounds'];

// The slider's handles: where the visitor put them, or the ends of the range.
$marketly_low  = ( null === $marketly_state['price_min'] ) ? $marketly_bounds[0] : $marketly_state['price_min'];
$marketly_high = ( null === $marketly_state['price_max'] ) ? $marketly_bounds[1] : $marketly_state['price_max'];

?>

<form class="cfilter__panel cfilter__panel--<?php echo esc_attr( $marketly_mode ); ?>"
	id="marketly-filter-panel"
	method="get"
	action="<?php echo esc_url( $marketly_base ); ?>"
	data-marketly-filter
	data-base="<?php echo esc_url( $marketly_base ); ?>"
	aria-label="<?php esc_attr_e( 'Filter products', 'marketly' ); ?>">

	<?php
	// A category or brand archive already says which term it is; the filter
	// must not re-send it as a query argument and turn a pretty permalink
	// into a duplicate filtered URL.
	if ( ! empty( $marketly_state['q'] ) && ! is_search() ) :
		?>
		<input type="hidden" name="q" value="<?php echo esc_attr( $marketly_state['q'] ); ?>">
	<?php endif; ?>

	<div class="cfilter__bar">
		<span class="cfilter__brandmark">
			<?php marketly_icon( 'sliders', array( 'size' => 16 ) ); ?>
		</span>
		<div class="cfilter__headings">
			<h2 class="cfilter__title">
				<?php esc_html_e( 'Filters', 'marketly' ); ?>
				<span class="cfilter__badge" data-cf-badge<?php echo $marketly_active ? '' : ' hidden'; ?>><?php echo esc_html( number_format_i18n( $marketly_active ) ); ?></span>
			</h2>
			<p class="cfilter__count" data-cf-total>
				<?php
				if ( null === $marketly_facets['total'] ) {
					esc_html_e( 'Refine the catalogue', 'marketly' );
				} else {
					printf(
						/* translators: %s: number of products. */
						esc_html( _n( '%s product matches', '%s products match', (int) $marketly_facets['total'], 'marketly' ) ),
						esc_html( number_format_i18n( (int) $marketly_facets['total'] ) )
					);
				}
				?>
			</p>
		</div>

		<a class="cfilter__reset<?php echo $marketly_active ? '' : ' is-hidden'; ?>"
			href="<?php echo esc_url( $marketly_base ); ?>"
			data-cf-reset>
			<?php marketly_icon( 'refresh', array( 'size' => 13 ) ); ?>
			<span><?php esc_html_e( 'Reset', 'marketly' ); ?></span>
		</a>

		<button type="button" class="cfilter__close" data-cf-close>
			<?php
			marketly_icon(
				'close',
				array(
					'size'  => 18,
					'label' => __( 'Close filters', 'marketly' ),
				)
			);
			?>
		</button>
	</div>

	<?php /* ------------------------------------------- Quick presets */ ?>
	<div class="cfquick">
		<p class="cfquick__label"><?php esc_html_e( 'Quick filters', 'marketly' ); ?></p>
		<div class="cfquick__row">
			<?php
			$marketly_quick = array(
				'sale'     => array( 'flame', __( 'On sale', 'marketly' ), 'sale' ),
				'top'      => array( 'award', __( 'Bestsellers', 'marketly' ), 'top' ),
				'instock'  => array( 'shield', __( 'In stock', 'marketly' ), 'instock' ),
				'featured' => array( 'zap', __( 'Featured', 'marketly' ), 'featured' ),
			);

			foreach ( $marketly_quick as $marketly_key => $marketly_row ) :
				$marketly_on = (bool) $marketly_state[ $marketly_key ];
				?>
				<label class="cfchip cfchip--<?php echo esc_attr( $marketly_key ); ?><?php echo $marketly_on ? ' is-on' : ''; ?>">
					<input type="checkbox"
						class="cfchip__input"
						name="<?php echo esc_attr( $marketly_key ); ?>"
						value="1"
						<?php checked( $marketly_on ); ?>>
					<?php marketly_icon( $marketly_row[0], array( 'size' => 13 ) ); ?>
					<span><?php echo esc_html( $marketly_row[1] ); ?></span>
				</label>
			<?php endforeach; ?>

			<?php
			// A rating shortcut, expressed as the same control the Rating
			// section uses so the two can never disagree.
			$marketly_top_rated = ( 4.5 === (float) $marketly_state['rating'] );
			?>
			<label class="cfchip cfchip--rating<?php echo $marketly_top_rated ? ' is-on' : ''; ?>">
				<input type="checkbox"
					class="cfchip__input"
					data-cf-rating-shortcut
					value="4.5"
					<?php checked( $marketly_top_rated ); ?>>
				<?php
				marketly_icon(
					'star',
					array(
						'size' => 13,
						'fill' => 'currentColor',
					)
				);
				?>
				<span><?php esc_html_e( '4.5 & up', 'marketly' ); ?></span>
			</label>
		</div>
	</div>

	<?php /* --------------------------------------------- Active chips */ ?>
	<?php if ( $marketly_active ) : ?>
		<div class="cfactive">
			<span class="cfactive__label"><?php esc_html_e( 'Applied:', 'marketly' ); ?></span>
			<?php
			foreach ( marketly_filter_chips( $marketly_state, $marketly_base ) as $marketly_chip ) :
				?>
				<a class="cfactive__chip" href="<?php echo esc_url( $marketly_chip['url'] ); ?>">
					<span><?php echo esc_html( $marketly_chip['label'] ); ?></span>
					<?php marketly_icon( 'close', array( 'size' => 11 ) ); ?>
					<span class="screen-reader-text">
						<?php
						printf(
							/* translators: %s: name of the filter being removed. */
							esc_html__( 'Remove filter: %s', 'marketly' ),
							esc_html( $marketly_chip['label'] )
						);
						?>
					</span>
				</a>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>

	<div class="cfilter__scroll">

		<?php /* -------------------------------------------- Categories */ ?>
		<?php if ( $marketly_facets['categories'] ) : ?>
			<?php
			marketly_filter_section_open(
				'cat',
				'grid',
				__( 'Category', 'marketly' ),
				'' !== $marketly_state['cat'] ? marketly_filter_term_name( $marketly_state['cat'], 'product_cat' ) : ''
			);
			?>
			<ul class="cflist cflist--radio">
				<li>
					<label class="cfopt">
						<input type="radio"
							name="cat"
							value=""
							class="cfopt__input"
							<?php checked( '', $marketly_state['cat'] ); ?>>
						<span class="cfopt__mark" aria-hidden="true"></span>
						<span class="cfopt__name"><?php esc_html_e( 'All categories', 'marketly' ); ?></span>
					</label>
				</li>
				<?php foreach ( $marketly_facets['categories'] as $marketly_term ) : ?>
					<li>
						<label class="cfopt<?php echo $marketly_term['count'] ? '' : ' is-empty'; ?>">
							<input type="radio"
								name="cat"
								value="<?php echo esc_attr( $marketly_term['slug'] ); ?>"
								class="cfopt__input"
								<?php checked( $marketly_term['slug'], $marketly_state['cat'] ); ?>>
							<span class="cfopt__mark" aria-hidden="true"></span>
							<span class="cfopt__name"><?php echo esc_html( $marketly_term['name'] ); ?></span>
							<?php if ( $marketly_facets['counted'] ) : ?>
								<span class="cfopt__count"><?php echo esc_html( number_format_i18n( $marketly_term['count'] ) ); ?></span>
							<?php endif; ?>
						</label>
					</li>
				<?php endforeach; ?>
			</ul>
			<?php marketly_filter_section_close(); ?>
		<?php endif; ?>

		<?php /* ------------------------------------------- Price range */ ?>
		<?php
		marketly_filter_section_open(
			'price',
			'tag',
			__( 'Price', 'marketly' ),
			( null !== $marketly_state['price_min'] || null !== $marketly_state['price_max'] )
				? wp_strip_all_tags( wc_price( $marketly_low ) ) . ' – ' . wp_strip_all_tags( wc_price( $marketly_high ) )
				: ''
		);
		?>
		<div class="cfprice"
			data-cf-price
			data-min="<?php echo esc_attr( $marketly_bounds[0] ); ?>"
			data-max="<?php echo esc_attr( $marketly_bounds[1] ); ?>">

			<div class="cfprice__track" aria-hidden="true">
				<span class="cfprice__fill" data-cf-price-fill></span>
			</div>

			<?php
			// Two overlaid range inputs rather than a div-and-mousemove
			// widget: each handle is a real slider a keyboard can drive and
			// a screen reader can announce, and both degrade to usable
			// controls if the stylesheet never arrives.
			?>
			<label class="screen-reader-text" for="cfprice-lo"><?php esc_html_e( 'Minimum price', 'marketly' ); ?></label>
			<input type="range"
				id="cfprice-lo"
				class="cfprice__range cfprice__range--min"
				data-cf-price-min
				min="<?php echo esc_attr( $marketly_bounds[0] ); ?>"
				max="<?php echo esc_attr( $marketly_bounds[1] ); ?>"
				step="1"
				value="<?php echo esc_attr( $marketly_low ); ?>">

			<label class="screen-reader-text" for="cfprice-hi"><?php esc_html_e( 'Maximum price', 'marketly' ); ?></label>
			<input type="range"
				id="cfprice-hi"
				class="cfprice__range cfprice__range--max"
				data-cf-price-max
				min="<?php echo esc_attr( $marketly_bounds[0] ); ?>"
				max="<?php echo esc_attr( $marketly_bounds[1] ); ?>"
				step="1"
				value="<?php echo esc_attr( $marketly_high ); ?>">

			<div class="cfprice__fields">
				<span class="cfprice__field">
					<label class="cfprice__flabel" for="cfprice-from"><?php esc_html_e( 'From', 'marketly' ); ?></label>
					<input type="number"
						id="cfprice-from"
						name="price_min"
						class="cfprice__input"
						data-cf-price-from
						inputmode="decimal"
						min="<?php echo esc_attr( $marketly_bounds[0] ); ?>"
						max="<?php echo esc_attr( $marketly_bounds[1] ); ?>"
						value="<?php echo esc_attr( null === $marketly_state['price_min'] ? '' : $marketly_state['price_min'] ); ?>"
						placeholder="<?php echo esc_attr( $marketly_bounds[0] ); ?>">
				</span>
				<span class="cfprice__dash" aria-hidden="true">–</span>
				<span class="cfprice__field">
					<label class="cfprice__flabel" for="cfprice-to"><?php esc_html_e( 'To', 'marketly' ); ?></label>
					<input type="number"
						id="cfprice-to"
						name="price_max"
						class="cfprice__input"
						data-cf-price-to
						inputmode="decimal"
						min="<?php echo esc_attr( $marketly_bounds[0] ); ?>"
						max="<?php echo esc_attr( $marketly_bounds[1] ); ?>"
						value="<?php echo esc_attr( null === $marketly_state['price_max'] ? '' : $marketly_state['price_max'] ); ?>"
						placeholder="<?php echo esc_attr( $marketly_bounds[1] ); ?>">
				</span>
			</div>
		</div>
		<?php marketly_filter_section_close(); ?>

		<?php /* ------------------------------- Availability and deals */ ?>
		<?php marketly_filter_section_open( 'status', 'shield', __( 'Availability', 'marketly' ) ); ?>
		<ul class="cflist">
			<?php
			$marketly_toggles = array(
				'instock'  => array( 'shield', __( 'In stock only', 'marketly' ) ),
				'sale'     => array( 'flame', __( 'On sale', 'marketly' ) ),
				'featured' => array( 'zap', __( 'Featured', 'marketly' ) ),
				'top'      => array( 'award', __( 'Bestsellers', 'marketly' ) ),
			);

			foreach ( $marketly_toggles as $marketly_key => $marketly_row ) :
				$marketly_hits = isset( $marketly_facets['toggles'][ $marketly_key ] )
					? (int) $marketly_facets['toggles'][ $marketly_key ]
					: 0;
				?>
				<li>
					<label class="cfopt cfopt--switch">
						<input type="checkbox"
							name="<?php echo esc_attr( $marketly_key ); ?>"
							value="1"
							class="cfopt__input"
							data-cf-mirror="<?php echo esc_attr( $marketly_key ); ?>"
							<?php checked( (bool) $marketly_state[ $marketly_key ] ); ?>>
						<span class="cfopt__mark cfopt__mark--box" aria-hidden="true">
							<?php marketly_icon( 'check', array( 'size' => 11 ) ); ?>
						</span>
						<span class="cfopt__name">
							<?php
							marketly_icon(
								$marketly_row[0],
								array(
									'size'  => 14,
									'class' => 'cfopt__glyph',
								)
							);
							?>
							<span><?php echo esc_html( $marketly_row[1] ); ?></span>
						</span>
						<?php if ( $marketly_facets['counted'] ) : ?>
							<span class="cfopt__count"><?php echo esc_html( number_format_i18n( $marketly_hits ) ); ?></span>
						<?php endif; ?>
					</label>
				</li>
			<?php endforeach; ?>
		</ul>
		<?php marketly_filter_section_close(); ?>

		<?php /* ------------------------------------------------ Brands */ ?>
		<?php if ( count( $marketly_facets['brands'] ) > 1 ) : ?>
			<?php
			marketly_filter_section_open(
				'brand',
				'award',
				__( 'Brand', 'marketly' ),
				$marketly_state['brand']
					? sprintf(
						/* translators: %s: number of selected brands. */
						_n( '%s selected', '%s selected', count( $marketly_state['brand'] ), 'marketly' ),
						number_format_i18n( count( $marketly_state['brand'] ) )
					)
					: '',
				(bool) $marketly_state['brand']
			);
			?>

			<?php if ( count( $marketly_facets['brands'] ) > 8 ) : ?>
				<div class="cfsearch">
					<?php
					marketly_icon(
						'search',
						array(
							'size'  => 14,
							'class' => 'cfsearch__icon',
						)
					);
					?>
					<label class="screen-reader-text" for="cfbrand-search"><?php esc_html_e( 'Search brands', 'marketly' ); ?></label>
					<input type="search"
						id="cfbrand-search"
						class="cfsearch__input"
						data-cf-brand-search
						placeholder="<?php esc_attr_e( 'Search brands…', 'marketly' ); ?>"
						autocomplete="off">
				</div>
			<?php endif; ?>

			<ul class="cflist cflist--scroll" data-cf-brand-list>
				<?php foreach ( $marketly_facets['brands'] as $marketly_term ) : ?>
					<li data-cf-name="<?php echo esc_attr( strtolower( $marketly_term['name'] ) ); ?>">
						<label class="cfopt<?php echo $marketly_term['count'] ? '' : ' is-empty'; ?>">
							<input type="checkbox"
								name="brand[]"
								value="<?php echo esc_attr( $marketly_term['slug'] ); ?>"
								class="cfopt__input"
								<?php checked( in_array( $marketly_term['slug'], $marketly_state['brand'], true ) ); ?>>
							<span class="cfopt__mark cfopt__mark--box" aria-hidden="true">
								<?php marketly_icon( 'check', array( 'size' => 11 ) ); ?>
							</span>
							<span class="cfopt__name"><?php echo esc_html( $marketly_term['name'] ); ?></span>
							<?php if ( $marketly_facets['counted'] ) : ?>
								<span class="cfopt__count"><?php echo esc_html( number_format_i18n( $marketly_term['count'] ) ); ?></span>
							<?php endif; ?>
						</label>
					</li>
				<?php endforeach; ?>
			</ul>
			<p class="cflist__none" data-cf-brand-none hidden><?php esc_html_e( 'No brands match that search.', 'marketly' ); ?></p>
			<?php marketly_filter_section_close(); ?>
		<?php endif; ?>

		<?php /* --------------------------------------- Customer rating */ ?>
		<?php
		marketly_filter_section_open(
			'rating',
			'star',
			__( 'Customer rating', 'marketly' ),
			$marketly_state['rating'] > 0
				? sprintf(
					/* translators: %s: star rating. */
					__( '%s & up', 'marketly' ),
					number_format_i18n( $marketly_state['rating'], 1 )
				)
				: '',
			$marketly_state['rating'] > 0
		);
		?>
		<ul class="cflist cflist--radio">
			<?php foreach ( marketly_filter_rating_steps() as $marketly_step ) : ?>
				<?php
				$marketly_hits = isset( $marketly_facets['ratings'][ (string) $marketly_step ] )
					? (int) $marketly_facets['ratings'][ (string) $marketly_step ]
					: 0;
				?>
				<li>
					<label class="cfopt<?php echo $marketly_hits ? '' : ' is-empty'; ?>">
						<input type="radio"
							name="rating"
							value="<?php echo esc_attr( $marketly_step ); ?>"
							class="cfopt__input"
							data-cf-rating
							<?php checked( (float) $marketly_step, (float) $marketly_state['rating'] ); ?>>
						<span class="cfopt__mark" aria-hidden="true"></span>
						<span class="cfopt__name cfopt__name--stars">
							<?php marketly_rating_stars( (float) $marketly_step, 0, 'compact' ); ?>
							<span>
							<?php
								printf(
									/* translators: %s: star rating. */
									esc_html__( '%s & up', 'marketly' ),
									esc_html( number_format_i18n( $marketly_step, 1 ) )
								);
							?>
							</span>
						</span>
						<?php if ( $marketly_facets['counted'] ) : ?>
							<span class="cfopt__count"><?php echo esc_html( number_format_i18n( $marketly_hits ) ); ?></span>
						<?php endif; ?>
					</label>
				</li>
			<?php endforeach; ?>
			<li>
				<label class="cfopt">
					<input type="radio"
						name="rating"
						value="0"
						class="cfopt__input"
						data-cf-rating
						<?php checked( 0.0, (float) $marketly_state['rating'] ); ?>>
					<span class="cfopt__mark" aria-hidden="true"></span>
					<span class="cfopt__name"><?php esc_html_e( 'Any rating', 'marketly' ); ?></span>
				</label>
			</li>
		</ul>
		<?php marketly_filter_section_close(); ?>

		<?php /* -------------------------------------------- Discounts */ ?>
		<?php
		marketly_filter_section_open(
			'discount',
			'percent',
			__( 'Discount', 'marketly' ),
			$marketly_state['discount'] > 0
				? sprintf(
					/* translators: %s: percentage. */
					__( '%s%% or more', 'marketly' ),
					number_format_i18n( $marketly_state['discount'] )
				)
				: '',
			$marketly_state['discount'] > 0
		);
		?>
		<ul class="cflist cflist--radio">
			<li>
				<label class="cfopt">
					<input type="radio"
						name="discount"
						value="0"
						class="cfopt__input"
						<?php checked( 0, (int) $marketly_state['discount'] ); ?>>
					<span class="cfopt__mark" aria-hidden="true"></span>
					<span class="cfopt__name"><?php esc_html_e( 'Any price', 'marketly' ); ?></span>
				</label>
			</li>
			<?php foreach ( marketly_filter_discount_steps() as $marketly_step ) : ?>
				<?php
				$marketly_hits = isset( $marketly_facets['discounts'][ (string) $marketly_step ] )
					? (int) $marketly_facets['discounts'][ (string) $marketly_step ]
					: 0;
				?>
				<li>
					<label class="cfopt<?php echo $marketly_hits ? '' : ' is-empty'; ?>">
						<input type="radio"
							name="discount"
							value="<?php echo esc_attr( $marketly_step ); ?>"
							class="cfopt__input"
							<?php checked( (int) $marketly_step, (int) $marketly_state['discount'] ); ?>>
						<span class="cfopt__mark" aria-hidden="true"></span>
						<span class="cfopt__name">
							<?php
							printf(
								/* translators: %s: percentage. */
								esc_html__( '%s%% off or more', 'marketly' ),
								esc_html( number_format_i18n( $marketly_step ) )
							);
							?>
						</span>
						<?php if ( $marketly_facets['counted'] ) : ?>
							<span class="cfopt__count"><?php echo esc_html( number_format_i18n( $marketly_hits ) ); ?></span>
						<?php endif; ?>
					</label>
				</li>
			<?php endforeach; ?>
		</ul>
		<?php marketly_filter_section_close(); ?>

		<?php /* ------------------------------------------------- Tags */ ?>
		<?php if ( count( $marketly_facets['tags'] ) > 1 ) : ?>
			<?php
			marketly_filter_section_open(
				'tag',
				'tag',
				__( 'Popular tags', 'marketly' ),
				$marketly_state['tag']
					? sprintf(
						/* translators: %s: number of selected tags. */
						_n( '%s selected', '%s selected', count( $marketly_state['tag'] ), 'marketly' ),
						number_format_i18n( count( $marketly_state['tag'] ) )
					)
					: '',
				(bool) $marketly_state['tag']
			);
			?>
			<div class="cftags">
				<?php foreach ( array_slice( $marketly_facets['tags'], 0, 14 ) as $marketly_term ) : ?>
					<?php $marketly_on = in_array( $marketly_term['slug'], $marketly_state['tag'], true ); ?>
					<label class="cftag<?php echo $marketly_on ? ' is-on' : ''; ?><?php echo $marketly_term['count'] ? '' : ' is-empty'; ?>">
						<input type="checkbox"
							name="tag[]"
							value="<?php echo esc_attr( $marketly_term['slug'] ); ?>"
							class="cftag__input"
							<?php checked( $marketly_on ); ?>>
						<span><?php echo esc_html( $marketly_term['name'] ); ?></span>
						<?php if ( $marketly_facets['counted'] ) : ?>
							<span class="cftag__count"><?php echo esc_html( number_format_i18n( $marketly_term['count'] ) ); ?></span>
						<?php endif; ?>
					</label>
				<?php endforeach; ?>
			</div>
			<?php marketly_filter_section_close(); ?>
		<?php endif; ?>

	</div><?php // .cfilter__scroll ?>

	<div class="cfilter__foot">
		<a class="btn btn--ghost btn--sm cfilter__clear" href="<?php echo esc_url( $marketly_base ); ?>" data-cf-reset>
			<?php esc_html_e( 'Clear all', 'marketly' ); ?>
		</a>
		<button type="submit" class="btn btn--primary cfilter__apply">
			<?php
			if ( null === $marketly_facets['total'] ) {
				esc_html_e( 'Show results', 'marketly' );
			} else {
				printf(
					/* translators: %s: number of products. */
					esc_html( _n( 'Show %s product', 'Show %s products', (int) $marketly_facets['total'], 'marketly' ) ),
					esc_html( number_format_i18n( (int) $marketly_facets['total'] ) )
				);
			}
			?>
		</button>
	</div>
</form>

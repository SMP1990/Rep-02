<?php
/**
 * Catalog filter panel.
 *
 * A single GET form. Submitting it produces a shareable URL and reloads the
 * archive with the filters applied server-side. The only JavaScript involved
 * is the disclosure toggle for the advanced panel, and even that starts open
 * when filters are active so it works without scripting.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

$haven_filters = isset( $args['filters'] ) ? $args['filters'] : array();
$haven_active  = isset( $args['active'] ) ? (int) $args['active'] : 0;
$haven_action  = isset( $args['action'] ) ? $args['action'] : haven_archive_url();

$haven_get = static function ( $key, $default = '' ) use ( $haven_filters ) {
	return isset( $haven_filters[ $key ] ) && '' !== $haven_filters[ $key ] ? $haven_filters[ $key ] : $default;
};

$haven_amenities = get_terms(
	array(
		'taxonomy'   => 'property_amenity',
		'hide_empty' => true,
		'orderby'    => 'name',
	)
);

$haven_selected_amenities = isset( $haven_filters['amenity'] ) ? (array) $haven_filters['amenity'] : array();
?>

<form class="filters" method="get" action="<?php echo esc_url( $haven_action ); ?>" role="search">

	<div class="filters__bar">
		<div class="filters__search">
			<?php haven_the_icon( 'search', 'icon--gold' ); ?>
			<label class="screen-reader-text" for="haven-q"><?php esc_html_e( 'Search properties', 'haven' ); ?></label>
			<input
				type="search"
				id="haven-q"
				name="q"
				value="<?php echo esc_attr( $haven_get( 'q' ) ); ?>"
				placeholder="<?php esc_attr_e( 'Search by keyword, style, or city…', 'haven' ); ?>"
			>
		</div>

		<div class="filters__control">
			<?php haven_the_icon( 'map-pin', 'icon--gold' ); ?>
			<label class="screen-reader-text" for="haven-location"><?php esc_html_e( 'Location', 'haven' ); ?></label>
			<?php haven_term_select( 'property_location', 'location', $haven_get( 'location' ), __( 'All Locations', 'haven' ) ); ?>
			<?php haven_the_icon( 'chevron-down', 'filters__chevron' ); ?>
		</div>

		<div class="filters__control">
			<?php haven_the_icon( 'home', 'icon--gold' ); ?>
			<label class="screen-reader-text" for="haven-type"><?php esc_html_e( 'Property type', 'haven' ); ?></label>
			<?php haven_term_select( 'property_type', 'type', $haven_get( 'type' ), __( 'All Types', 'haven' ) ); ?>
			<?php haven_the_icon( 'chevron-down', 'filters__chevron' ); ?>
		</div>

		<button
			class="btn btn--outline filters__toggle <?php echo $haven_active ? 'is-active' : ''; ?>"
			type="button"
			aria-expanded="<?php echo $haven_active ? 'true' : 'false'; ?>"
			aria-controls="haven-advanced-filters"
			data-haven-filters-toggle
		>
			<?php haven_the_icon( 'sliders', 'icon--gold' ); ?>
			<span>
				<?php esc_html_e( 'Filters', 'haven' ); ?>
				<?php if ( $haven_active ) : ?>
					<span class="filters__count">(<?php echo esc_html( number_format_i18n( $haven_active ) ); ?>)</span>
				<?php endif; ?>
			</span>
		</button>

		<button class="btn btn--dark filters__submit" type="submit">
			<?php esc_html_e( 'Search', 'haven' ); ?>
		</button>
	</div>

	<div class="filters__advanced" id="haven-advanced-filters" <?php echo $haven_active ? '' : 'hidden'; ?>>

		<div class="filters__row">
			<p class="filters__field">
				<label for="haven-min_price"><?php esc_html_e( 'Min Price', 'haven' ); ?></label>
				<input type="number" inputmode="numeric" min="0" step="1000" id="haven-min_price" name="min_price" value="<?php echo esc_attr( $haven_get( 'min_price' ) ); ?>" placeholder="<?php esc_attr_e( 'No minimum', 'haven' ); ?>">
			</p>

			<p class="filters__field">
				<label for="haven-max_price"><?php esc_html_e( 'Max Price', 'haven' ); ?></label>
				<input type="number" inputmode="numeric" min="0" step="1000" id="haven-max_price" name="max_price" value="<?php echo esc_attr( $haven_get( 'max_price' ) ); ?>" placeholder="<?php esc_attr_e( 'No maximum', 'haven' ); ?>">
			</p>

			<p class="filters__field">
				<label for="haven-beds"><?php esc_html_e( 'Min Bedrooms', 'haven' ); ?></label>
				<select id="haven-beds" name="beds">
					<option value=""><?php esc_html_e( 'Any', 'haven' ); ?></option>
					<?php foreach ( range( 1, 6 ) as $haven_n ) : ?>
						<option value="<?php echo esc_attr( $haven_n ); ?>" <?php selected( (string) $haven_get( 'beds' ), (string) $haven_n ); ?>>
							<?php
							printf(
								/* translators: %d: number of bedrooms */
								esc_html__( '%d+ Beds', 'haven' ),
								absint( $haven_n )
							);
							?>
						</option>
					<?php endforeach; ?>
				</select>
			</p>

			<p class="filters__field">
				<label for="haven-baths"><?php esc_html_e( 'Min Bathrooms', 'haven' ); ?></label>
				<select id="haven-baths" name="baths">
					<option value=""><?php esc_html_e( 'Any', 'haven' ); ?></option>
					<?php foreach ( range( 1, 6 ) as $haven_n ) : ?>
						<option value="<?php echo esc_attr( $haven_n ); ?>" <?php selected( (string) $haven_get( 'baths' ), (string) $haven_n ); ?>>
							<?php
							printf(
								/* translators: %d: number of bathrooms */
								esc_html__( '%d+ Baths', 'haven' ),
								absint( $haven_n )
							);
							?>
						</option>
					<?php endforeach; ?>
				</select>
			</p>

			<p class="filters__field">
				<label for="haven-min_area"><?php esc_html_e( 'Min Area (sq ft)', 'haven' ); ?></label>
				<input type="number" inputmode="numeric" min="0" step="100" id="haven-min_area" name="min_area" value="<?php echo esc_attr( $haven_get( 'min_area' ) ); ?>" placeholder="<?php esc_attr_e( 'Any', 'haven' ); ?>">
			</p>
		</div>

		<?php if ( $haven_amenities && ! is_wp_error( $haven_amenities ) ) : ?>
			<fieldset class="filters__amenities">
				<legend><?php esc_html_e( 'Luxury Features & Amenities', 'haven' ); ?></legend>

				<div class="chip-set">
					<?php foreach ( $haven_amenities as $haven_amenity ) : ?>
						<label class="chip">
							<input
								type="checkbox"
								name="amenity[]"
								value="<?php echo esc_attr( $haven_amenity->slug ); ?>"
								<?php checked( in_array( $haven_amenity->slug, $haven_selected_amenities, true ) ); ?>
							>
							<span><?php echo esc_html( $haven_amenity->name ); ?></span>
							<?php haven_the_icon( 'check', 'chip__check' ); ?>
						</label>
					<?php endforeach; ?>
				</div>
			</fieldset>
		<?php endif; ?>

		<div class="filters__footer">
			<?php if ( $haven_active ) : ?>
				<a class="btn btn--outline btn--sm" href="<?php echo esc_url( $haven_action ); ?>">
					<?php haven_the_icon( 'reset', 'icon--gold' ); ?>
					<span><?php esc_html_e( 'Reset All Filters', 'haven' ); ?></span>
				</a>
			<?php endif; ?>

			<button class="btn btn--dark btn--sm" type="submit"><?php esc_html_e( 'Apply Filters', 'haven' ); ?></button>
		</div>

	</div>
</form>

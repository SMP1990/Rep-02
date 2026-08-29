<?php
/**
 * Property catalog — search, filter, sort, paginate.
 *
 * All filtering happens server-side in Haven_Query, so this template just
 * renders whatever the main query returned. Filtered views are canonicalised
 * and noindexed back to the clean archive (see inc/seo.php) so search engines
 * index one strong catalog page instead of thousands of permutations.
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

get_header();

$haven_filters = class_exists( 'Haven_Query' ) ? Haven_Query::current_filters() : array();
$haven_active  = class_exists( 'Haven_Query' ) ? Haven_Query::active_filter_count() : 0;
$haven_total   = (int) $GLOBALS['wp_query']->found_posts;

$haven_term        = is_tax() ? get_queried_object() : null;
$haven_archive_url = $haven_term ? get_term_link( $haven_term ) : haven_archive_url();
?>

<div class="archive">
	<div class="container">

		<?php haven_breadcrumbs(); ?>

		<header class="archive__header">
			<div>
				<p class="eyebrow">
					<?php
					echo esc_html(
						$haven_term
							? sprintf(
								/* translators: %s: taxonomy singular label */
								__( 'Haven Catalog — %s', 'haven' ),
								get_taxonomy( $haven_term->taxonomy )->labels->singular_name
							)
							: __( 'Haven Exclusive Catalog', 'haven' )
					);
					?>
				</p>

				<h1 class="archive__title">
					<?php
					echo esc_html( $haven_term ? $haven_term->name : __( 'Curated Property Listings', 'haven' ) );
					?>
				</h1>

				<p class="archive__count">
					<?php
					printf(
						/* translators: %s: number of properties */
						esc_html( _n( 'Explore %s distinguished residence across prime locations.', 'Explore %s distinguished residences across prime locations.', $haven_total, 'haven' ) ),
						esc_html( number_format_i18n( $haven_total ) )
					);
					?>
				</p>

				<?php if ( $haven_term && $haven_term->description ) : ?>
					<div class="archive__description"><?php echo wp_kses_post( wpautop( $haven_term->description ) ); ?></div>
				<?php endif; ?>
			</div>

			<div class="segmented" role="group" aria-label="<?php esc_attr_e( 'Filter by purpose', 'haven' ); ?>">
				<?php
				$haven_purposes = array(
					''         => __( 'All', 'haven' ),
					'for-sale' => __( 'For Sale', 'haven' ),
					'for-rent' => __( 'For Rent', 'haven' ),
				);

				foreach ( $haven_purposes as $haven_slug => $haven_label ) :
					$haven_is_on = ( isset( $haven_filters['purpose'] ) ? $haven_filters['purpose'] : '' ) === $haven_slug;
					?>
					<a
						class="segmented__item <?php echo $haven_is_on ? 'is-active' : ''; ?>"
						href="<?php echo esc_url( haven_filter_url( array( 'purpose' => $haven_slug ) ) ); ?>"
						<?php echo $haven_is_on ? 'aria-current="true"' : ''; ?>
					>
						<?php echo esc_html( $haven_label ); ?>
					</a>
				<?php endforeach; ?>
			</div>
		</header>

		<?php
		get_template_part(
			'template-parts/filters',
			null,
			array(
				'filters' => $haven_filters,
				'active'  => $haven_active,
				'action'  => $haven_archive_url,
			)
		);
		?>

		<div class="archive__toolbar">
			<p class="archive__results">
				<?php
				printf(
					/* translators: %s: number of properties */
					esc_html( _n( '%s Property Found', '%s Properties Found', $haven_total, 'haven' ) ),
					esc_html( number_format_i18n( $haven_total ) )
				);
				?>
			</p>

			<form class="archive__sort" method="get" action="<?php echo esc_url( $haven_archive_url ); ?>">
				<?php
				// Carry every other active filter through the sort form.
				foreach ( $haven_filters as $haven_key => $haven_value ) {
					if ( 'sort' === $haven_key || '' === $haven_value || array() === $haven_value ) {
						continue;
					}

					printf(
						'<input type="hidden" name="%s" value="%s">',
						esc_attr( $haven_key ),
						esc_attr( is_array( $haven_value ) ? implode( ',', $haven_value ) : $haven_value )
					);
				}
				?>

				<label for="haven-sort"><?php esc_html_e( 'Sort:', 'haven' ); ?></label>
				<select name="sort" id="haven-sort" data-haven-autosubmit>
					<?php
					$haven_sorts = array(
						'featured'   => __( 'Featured First', 'haven' ),
						'newest'     => __( 'Newest Listed', 'haven' ),
						'price_asc'  => __( 'Price: Low to High', 'haven' ),
						'price_desc' => __( 'Price: High to Low', 'haven' ),
						'area_desc'  => __( 'Largest Area', 'haven' ),
					);

					foreach ( $haven_sorts as $haven_key => $haven_label ) {
						printf(
							'<option value="%1$s" %2$s>%3$s</option>',
							esc_attr( $haven_key ),
							selected( isset( $haven_filters['sort'] ) ? $haven_filters['sort'] : 'featured', $haven_key, false ),
							esc_html( $haven_label )
						);
					}
					?>
				</select>

				<noscript><button class="btn btn--outline btn--sm" type="submit"><?php esc_html_e( 'Apply', 'haven' ); ?></button></noscript>
			</form>
		</div>

		<?php if ( have_posts() ) : ?>

			<div class="card-grid">
				<?php
				while ( have_posts() ) :
					the_post();
					get_template_part( 'template-parts/card', 'property' );
				endwhile;
				?>
			</div>

			<?php haven_pagination(); ?>

		<?php else : ?>

			<div class="empty-state">
				<span class="empty-state__icon"><?php haven_the_icon( 'search' ); ?></span>
				<h2 class="empty-state__title"><?php esc_html_e( 'No Properties Matched', 'haven' ); ?></h2>
				<p class="empty-state__body">
					<?php esc_html_e( 'We couldn’t find any residences matching your exact criteria. Try widening the price range or choosing another location.', 'haven' ); ?>
				</p>
				<a class="btn btn--dark" href="<?php echo esc_url( haven_archive_url() ); ?>">
					<?php haven_the_icon( 'reset', 'icon--gold' ); ?>
					<span><?php esc_html_e( 'Clear Filters', 'haven' ); ?></span>
				</a>
			</div>

		<?php endif; ?>

	</div>
</div>

<?php
get_footer();

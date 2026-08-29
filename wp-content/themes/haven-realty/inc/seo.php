<?php
/**
 * Search appearance — titles, meta descriptions, canonicals, Open Graph,
 * Twitter cards and Schema.org JSON-LD.
 *
 * This is everything an SEO plugin would give you, hand-written, with no
 * settings screen to configure and no plugin weight on the front end. The
 * per-listing overrides live on the property edit screen under
 * "Search Appearance".
 *
 * @package Haven
 */

defined( 'ABSPATH' ) || exit;

/**
 * Use the per-property SEO title when one is set.
 *
 * @param array $parts Title parts.
 * @return array
 */
function haven_document_title_parts( $parts ) {
	if ( is_singular( 'property' ) ) {
		$custom = haven_field( 'seo_title' );

		if ( $custom ) {
			$parts['title'] = $custom;

			return $parts;
		}

		// Otherwise build a title that carries the facts a searcher scans for.
		$location = haven_get_location();
		$price    = haven_get_price_display();

		$parts['title'] = trim( get_the_title() . ( $location ? ', ' . $location : '' ) );
		$parts['title'] = $parts['title'] . ' | ' . $price;
	}

	if ( haven_is_property_archive() && ! is_tax() ) {
		$parts['title'] = __( 'Luxury Properties for Sale & Rent', 'haven' );
	}

	return $parts;
}
add_filter( 'document_title_parts', 'haven_document_title_parts' );

/**
 * The meta description for the current request.
 *
 * @return string
 */
function haven_meta_description() {
	if ( is_singular( 'property' ) ) {
		return haven_get_summary();
	}

	if ( is_singular() ) {
		$custom = get_post_meta( get_the_ID(), '_haven_seo_description', true );

		if ( $custom ) {
			return $custom;
		}

		$excerpt = has_excerpt() ? get_the_excerpt() : wp_strip_all_tags( get_the_content() );

		return wp_html_excerpt( trim( preg_replace( '/\s+/', ' ', $excerpt ) ), 158, '…' );
	}

	if ( is_post_type_archive( 'property' ) ) {
		return __( 'Browse the Haven Realty Group portfolio of luxury villas, penthouses, estates and residences for sale and rent in the world’s most distinguished addresses.', 'haven' );
	}

	if ( is_tax() ) {
		$term = get_queried_object();

		if ( $term && ! empty( $term->description ) ) {
			return wp_html_excerpt( wp_strip_all_tags( $term->description ), 158, '…' );
		}

		if ( $term ) {
			return sprintf(
				/* translators: %s: term name */
				__( 'Luxury properties in %s, curated and represented by Haven Realty Group.', 'haven' ),
				$term->name
			);
		}
	}

	if ( is_home() || is_front_page() ) {
		$tagline = get_bloginfo( 'description' );

		return $tagline ? $tagline : __( 'Haven Realty Group represents exceptional homes in prime locations — villas, penthouses, estates and premier urban residences.', 'haven' );
	}

	return '';
}

/**
 * The canonical URL for the current request.
 *
 * Filtered archive views (?type=villa&beds=4) all canonicalise back to the
 * clean archive so search engines index one page instead of thousands of
 * near-duplicate permutations.
 *
 * @return string
 */
function haven_canonical_url() {
	if ( is_singular() ) {
		return (string) get_permalink();
	}

	if ( is_post_type_archive( 'property' ) ) {
		$url  = haven_archive_url();
		$page = max( 1, (int) get_query_var( 'paged' ) );

		return $page > 1 ? trailingslashit( $url ) . 'page/' . $page . '/' : $url;
	}

	if ( is_tax() || is_category() || is_tag() ) {
		$term = get_queried_object();

		return $term ? (string) get_term_link( $term ) : home_url( '/' );
	}

	if ( is_front_page() || is_home() ) {
		return home_url( '/' );
	}

	if ( is_search() ) {
		return add_query_arg( 's', get_search_query(), home_url( '/' ) );
	}

	return home_url( add_query_arg( array(), $GLOBALS['wp']->request ) );
}

/**
 * Whether the current request should be kept out of the index.
 *
 * @return bool
 */
function haven_is_noindex() {
	if ( is_singular( 'property' ) && haven_field( 'seo_noindex' ) ) {
		return true;
	}

	// Filtered or sorted archives are thin duplicates of the clean archive.
	if ( haven_is_property_archive() && class_exists( 'Haven_Query' ) && Haven_Query::has_active_filters() ) {
		return true;
	}

	if ( is_search() || is_404() ) {
		return true;
	}

	return false;
}

/**
 * Print the full head block: robots, description, canonical, OG, Twitter.
 */
function haven_seo_head() {
	$description = haven_meta_description();
	$canonical   = haven_canonical_url();

	if ( haven_is_noindex() ) {
		echo '<meta name="robots" content="noindex,follow">' . "\n";
	} else {
		echo '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">' . "\n";
	}

	if ( $description ) {
		printf( '<meta name="description" content="%s">' . "\n", esc_attr( $description ) );
	}

	if ( $canonical ) {
		printf( '<link rel="canonical" href="%s">' . "\n", esc_url( $canonical ) );
	}

	// --- Open Graph ------------------------------------------------------.
	$og_type  = is_singular() ? 'article' : 'website';
	$og_title = wp_get_document_title();
	$image    = haven_social_image();

	printf( '<meta property="og:type" content="%s">' . "\n", esc_attr( $og_type ) );
	printf( '<meta property="og:site_name" content="%s">' . "\n", esc_attr( get_bloginfo( 'name' ) ) );
	printf( '<meta property="og:locale" content="%s">' . "\n", esc_attr( get_locale() ) );
	printf( '<meta property="og:title" content="%s">' . "\n", esc_attr( $og_title ) );

	if ( $description ) {
		printf( '<meta property="og:description" content="%s">' . "\n", esc_attr( $description ) );
	}

	if ( $canonical ) {
		printf( '<meta property="og:url" content="%s">' . "\n", esc_url( $canonical ) );
	}

	if ( $image ) {
		printf( '<meta property="og:image" content="%s">' . "\n", esc_url( $image['url'] ) );
		printf( '<meta property="og:image:width" content="%d">' . "\n", absint( $image['width'] ) );
		printf( '<meta property="og:image:height" content="%d">' . "\n", absint( $image['height'] ) );

		if ( ! empty( $image['alt'] ) ) {
			printf( '<meta property="og:image:alt" content="%s">' . "\n", esc_attr( $image['alt'] ) );
		}
	}

	// --- Twitter ---------------------------------------------------------.
	printf( '<meta name="twitter:card" content="%s">' . "\n", $image ? 'summary_large_image' : 'summary' );
	printf( '<meta name="twitter:title" content="%s">' . "\n", esc_attr( $og_title ) );

	if ( $description ) {
		printf( '<meta name="twitter:description" content="%s">' . "\n", esc_attr( $description ) );
	}

	if ( $image ) {
		printf( '<meta name="twitter:image" content="%s">' . "\n", esc_url( $image['url'] ) );
	}

	$handle = get_theme_mod( 'haven_twitter_handle', '' );

	if ( $handle ) {
		printf( '<meta name="twitter:site" content="@%s">' . "\n", esc_attr( ltrim( $handle, '@' ) ) );
	}

	printf( '<meta name="theme-color" content="%s">' . "\n", '#182923' );
}
add_action( 'wp_head', 'haven_seo_head', 2 );

/**
 * The best available social sharing image for this request.
 *
 * @return array{url:string,width:int,height:int,alt:string}|null
 */
function haven_social_image() {
	$attachment_id = 0;

	if ( is_singular() && has_post_thumbnail() ) {
		$attachment_id = get_post_thumbnail_id();
	} elseif ( is_front_page() ) {
		$attachment_id = (int) get_theme_mod( 'haven_hero_image_id', 0 );
	}

	if ( ! $attachment_id ) {
		$attachment_id = (int) get_theme_mod( 'haven_default_social_image_id', 0 );
	}

	if ( ! $attachment_id ) {
		$fallback = (string) get_theme_mod( 'haven_hero_image_fallback', '' );

		return $fallback ? array(
			'url'    => $fallback,
			'width'  => 1200,
			'height' => 630,
			'alt'    => get_bloginfo( 'name' ),
		) : null;
	}

	$src = wp_get_attachment_image_src( $attachment_id, 'haven-gallery' );

	if ( ! $src ) {
		return null;
	}

	return array(
		'url'    => $src[0],
		'width'  => (int) $src[1],
		'height' => (int) $src[2],
		'alt'    => (string) get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ),
	);
}

/**
 * Print the JSON-LD graph.
 *
 * One `@graph` per page rather than several stacked blocks — that is what
 * Google's own documentation recommends, and it lets the nodes reference each
 * other by `@id`.
 */
function haven_schema() {
	$site_id = home_url( '/#organization' );
	$graph   = array();
	$image   = haven_social_image();

	// --- RealEstateAgent (the business itself) ---------------------------.
	$organization = array(
		'@type'      => 'RealEstateAgent',
		'@id'        => $site_id,
		'name'       => get_bloginfo( 'name' ),
		'url'        => home_url( '/' ),
		'priceRange' => get_theme_mod( 'haven_price_range', '$$$$' ),
	);

	if ( $image ) {
		$organization['image'] = $image['url'];
	}

	$description = get_bloginfo( 'description' );

	if ( $description ) {
		$organization['description'] = $description;
	}

	$phone = get_theme_mod( 'haven_contact_phone', '' );
	$email = get_theme_mod( 'haven_contact_email', '' );

	if ( $phone ) {
		$organization['telephone'] = $phone;
	}

	if ( $email ) {
		$organization['email'] = $email;
	}

	$street = get_theme_mod( 'haven_contact_address', '' );

	if ( $street ) {
		$organization['address'] = array(
			'@type'         => 'PostalAddress',
			'streetAddress' => $street,
		);
	}

	$socials = array_filter(
		array(
			get_theme_mod( 'haven_social_facebook', '' ),
			get_theme_mod( 'haven_social_instagram', '' ),
			get_theme_mod( 'haven_social_linkedin', '' ),
			get_theme_mod( 'haven_social_youtube', '' ),
		)
	);

	if ( $socials ) {
		$organization['sameAs'] = array_values( $socials );
	}

	$graph[] = $organization;

	// --- WebSite with the property search action -------------------------.
	$graph[] = array(
		'@type'           => 'WebSite',
		'@id'             => home_url( '/#website' ),
		'url'             => home_url( '/' ),
		'name'            => get_bloginfo( 'name' ),
		'publisher'       => array( '@id' => $site_id ),
		'inLanguage'      => get_bloginfo( 'language' ),
		'potentialAction' => array(
			'@type'       => 'SearchAction',
			'target'      => array(
				'@type'       => 'EntryPoint',
				'urlTemplate' => haven_archive_url() . '?q={search_term_string}',
			),
			'query-input' => 'required name=search_term_string',
		),
	);

	if ( is_singular( 'property' ) ) {
		$graph[] = haven_property_schema();
		$graph[] = haven_breadcrumb_schema();
	} elseif ( haven_is_property_archive() ) {
		$graph[] = haven_breadcrumb_schema();
	}

	$graph = array_values( array_filter( $graph ) );

	printf(
		'<script type="application/ld+json">%s</script>' . "\n",
		wp_json_encode(
			array(
				'@context' => 'https://schema.org',
				'@graph'   => $graph,
			),
			JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
		)
	);
}
add_action( 'wp_head', 'haven_schema', 20 );

/**
 * Structured data for one listing.
 *
 * Modelled as a `RealEstateListing` (a CreativeWork subtype Google understands
 * for property pages) carrying an `Accommodation` for the residence itself and
 * an `Offer` for the price.
 *
 * @return array
 */
function haven_property_schema() {
	$post_id  = get_the_ID();
	$currency = haven_currency();
	$images   = array();

	foreach ( array_slice( haven_get_gallery_ids( $post_id ), 0, 6 ) as $attachment_id ) {
		$src = wp_get_attachment_image_src( $attachment_id, 'haven-gallery' );

		if ( $src ) {
			$images[] = $src[0];
		}
	}

	$accommodation = array(
		'@type' => 'Accommodation',
		'name'  => get_the_title(),
	);

	$bedrooms  = haven_field( 'bedrooms', $post_id );
	$bathrooms = haven_field( 'bathrooms', $post_id );
	$area      = haven_field( 'area_sqft', $post_id );
	$year      = haven_field( 'year_built', $post_id );

	if ( '' !== $bedrooms ) {
		$accommodation['numberOfBedrooms'] = (float) $bedrooms;
	}

	if ( '' !== $bathrooms ) {
		$accommodation['numberOfBathroomsTotal'] = (float) $bathrooms;
	}

	if ( '' !== $area ) {
		$accommodation['floorSize'] = array(
			'@type'    => 'QuantitativeValue',
			'value'    => (float) $area,
			'unitCode' => 'FTK', // Square foot.
		);
	}

	if ( '' !== $year ) {
		$accommodation['yearBuilt'] = (int) $year;
	}

	$address = array_filter(
		array(
			'@type'           => 'PostalAddress',
			'streetAddress'   => haven_field( 'address', $post_id ),
			'addressLocality' => haven_field( 'city', $post_id ),
			'addressRegion'   => haven_field( 'region', $post_id ),
			'postalCode'      => haven_field( 'postcode', $post_id ),
			'addressCountry'  => haven_field( 'country', $post_id ),
		)
	);

	if ( count( $address ) > 1 ) {
		$accommodation['address'] = $address;
	}

	$amenities = get_the_terms( $post_id, 'property_amenity' );

	if ( $amenities && ! is_wp_error( $amenities ) ) {
		$accommodation['amenityFeature'] = array_map(
			static function ( $term ) {
				return array(
					'@type' => 'LocationFeatureSpecification',
					'name'  => $term->name,
					'value' => true,
				);
			},
			array_values( $amenities )
		);
	}

	$listing = array(
		'@type'         => 'RealEstateListing',
		'@id'           => get_permalink() . '#listing',
		'url'           => get_permalink(),
		'name'          => get_the_title(),
		'description'   => haven_get_summary( $post_id, 300 ),
		'datePosted'    => get_the_date( DATE_W3C ),
		'dateModified'  => get_the_modified_date( DATE_W3C ),
		'about'         => $accommodation,
		'provider'      => array( '@id' => home_url( '/#organization' ) ),
	);

	if ( $images ) {
		$listing['image'] = $images;
	}

	$price = haven_field( 'price', $post_id );

	if ( '' !== $price && ! haven_field( 'price_on_request', $post_id ) ) {
		$availability_map = array(
			'active'  => 'https://schema.org/InStock',
			'pending' => 'https://schema.org/LimitedAvailability',
			'sold'    => 'https://schema.org/SoldOut',
			'rented'  => 'https://schema.org/SoldOut',
		);

		$availability = haven_field( 'availability', $post_id );

		$offer = array(
			'@type'         => 'Offer',
			'price'         => (float) $price,
			'priceCurrency' => $currency['code'],
			'availability'  => isset( $availability_map[ $availability ] ) ? $availability_map[ $availability ] : $availability_map['active'],
			'url'           => get_permalink(),
			'seller'        => array( '@id' => home_url( '/#organization' ) ),
		);

		$period = haven_field( 'price_period', $post_id );

		if ( $period ) {
			$units = array(
				'month' => 'MON',
				'week'  => 'WEE',
				'night' => 'DAY',
			);

			$offer['priceSpecification'] = array(
				'@type'                 => 'UnitPriceSpecification',
				'price'                 => (float) $price,
				'priceCurrency'         => $currency['code'],
				'unitCode'              => isset( $units[ $period ] ) ? $units[ $period ] : 'MON',
				'billingIncrement'      => 1,
			);
		}

		$listing['offers'] = $offer;
	}

	return $listing;
}

/**
 * BreadcrumbList matching the visible breadcrumb trail.
 *
 * @return array
 */
function haven_breadcrumb_schema() {
	$items = array(
		array(
			'name' => __( 'Home', 'haven' ),
			'url'  => home_url( '/' ),
		),
		array(
			'name' => __( 'Properties', 'haven' ),
			'url'  => haven_archive_url(),
		),
	);

	if ( is_tax() ) {
		$term = get_queried_object();

		if ( $term ) {
			$items[] = array(
				'name' => $term->name,
				'url'  => (string) get_term_link( $term ),
			);
		}
	}

	if ( is_singular( 'property' ) ) {
		$location = haven_first_term( 'property_location' );

		if ( $location ) {
			$term = get_term_by( 'name', $location, 'property_location' );

			if ( $term ) {
				$items[] = array(
					'name' => $term->name,
					'url'  => (string) get_term_link( $term ),
				);
			}
		}

		$items[] = array(
			'name' => get_the_title(),
			'url'  => (string) get_permalink(),
		);
	}

	$elements = array();

	foreach ( array_values( $items ) as $index => $item ) {
		$elements[] = array(
			'@type'    => 'ListItem',
			'position' => $index + 1,
			'name'     => $item['name'],
			'item'     => $item['url'],
		);
	}

	return array(
		'@type'           => 'BreadcrumbList',
		'@id'             => haven_canonical_url() . '#breadcrumb',
		'itemListElement' => $elements,
	);
}

/**
 * Render the visible breadcrumb trail.
 */
function haven_breadcrumbs() {
	$schema = haven_breadcrumb_schema();
	$items  = $schema['itemListElement'];

	echo '<nav class="breadcrumbs" aria-label="' . esc_attr__( 'Breadcrumb', 'haven' ) . '"><ol>';

	$last = count( $items ) - 1;

	foreach ( $items as $index => $item ) {
		if ( $index === $last ) {
			printf( '<li aria-current="page">%s</li>', esc_html( $item['name'] ) );
			continue;
		}

		printf(
			'<li><a href="%s">%s</a></li>',
			esc_url( $item['item'] ),
			esc_html( $item['name'] )
		);
	}

	echo '</ol></nav>';
}

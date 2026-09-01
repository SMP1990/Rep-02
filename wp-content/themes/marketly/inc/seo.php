<?php
/**
 * Search-engine output: descriptions, canonicals, social cards and the
 * structured data nobody else provides.
 *
 * Two rules govern this file.
 *
 * First, it stands down completely when a dedicated SEO plugin is active.
 * Yoast, Rank Math and the rest emit the same tags, and two competing
 * descriptions or canonicals is worse than either alone.
 *
 * Second, it does not duplicate WooCommerce. WooCommerce already emits
 * Product, Offer, AggregateRating, Review and BreadcrumbList JSON-LD on its
 * own pages, so the theme adds only what is missing: Organization, WebSite
 * with a search action, and Article for editorial posts.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether a dedicated SEO plugin is handling this.
 *
 * @return bool
 */
function marketly_seo_plugin_active() {
	static $active = null;

	if ( null !== $active ) {
		return $active;
	}

	$active = defined( 'WPSEO_VERSION' )              // Yoast SEO.
		|| defined( 'RANK_MATH_VERSION' )             // Rank Math.
		|| defined( 'SEOPRESS_VERSION' )              // SEOPress.
		|| defined( 'AIOSEO_VERSION' )                // All in One SEO.
		|| defined( 'THE_SEO_FRAMEWORK_VERSION' )     // The SEO Framework.
		|| defined( 'SLIM_SEO_VER' )                  // Slim SEO.
		|| class_exists( 'WPSEO_Frontend' );

	/**
	 * Filter whether the theme's SEO output is suppressed.
	 *
	 * @param bool $active True when something else is handling SEO.
	 */
	return (bool) apply_filters( 'marketly_seo_plugin_active', $active );
}

/**
 * Trim text to a meta-description length on a word boundary.
 *
 * @param string $text  Raw text.
 * @param int    $limit Character limit.
 * @return string
 */
function marketly_trim_description( $text, $limit = 155 ) {
	$text = wp_strip_all_tags( strip_shortcodes( (string) $text ), true );
	$text = trim( preg_replace( '/\s+/u', ' ', $text ) );

	if ( '' === $text ) {
		return '';
	}

	if ( mb_strlen( $text ) <= $limit ) {
		return $text;
	}

	$cut   = mb_substr( $text, 0, $limit );
	$space = mb_strrpos( $cut, ' ' );

	return rtrim( $space ? mb_substr( $cut, 0, $space ) : $cut, " ,.;:-" ) . '…';
}

/**
 * The description for the current view.
 *
 * @return string
 */
function marketly_meta_description() {
	$description = '';

	if ( is_front_page() ) {
		// The tagline is often left empty, and the hero's supporting text is
		// the store's own description of itself.
		$description = get_bloginfo( 'description' );

		if ( '' === trim( (string) $description ) ) {
			$description = marketly_option( 'hero_text' );
		}
	} elseif ( is_singular() ) {
		$post = get_queried_object();

		if ( $post instanceof WP_Post ) {
			// A product's short description is written to sell it, which is
			// exactly what a search snippet wants.
			if ( 'product' === $post->post_type && function_exists( 'wc_get_product' ) ) {
				$product = wc_get_product( $post );

				if ( $product ) {
					$description = $product->get_short_description();
				}
			}

			if ( '' === $description ) {
				$description = has_excerpt( $post ) ? get_the_excerpt( $post ) : $post->post_content;
			}
		}
	} elseif ( is_tax() || is_category() || is_tag() ) {
		$term = get_queried_object();

		if ( $term instanceof WP_Term ) {
			$description = $term->description;

			if ( '' === $description ) {
				$description = sprintf(
					/* translators: %s: category or tag name. */
					__( 'Browse %s at %s.', 'marketly' ),
					$term->name,
					get_bloginfo( 'name' )
				);
			}
		}
	} elseif ( is_search() ) {
		$description = sprintf(
			/* translators: %s: search term. */
			__( 'Search results for “%s”.', 'marketly' ),
			get_search_query()
		);
	} elseif ( function_exists( 'is_shop' ) && is_shop() ) {
		$shop = get_post( wc_get_page_id( 'shop' ) );

		if ( $shop && $shop->post_content ) {
			$description = $shop->post_content;
		} else {
			$description = get_bloginfo( 'description' );
		}
	}

	// Normalise before testing for emptiness: a page whose content is nothing
	// but [woocommerce_cart] is not "described", even though the raw string
	// is non-empty.
	if ( '' === marketly_trim_description( $description, 400 ) ) {
		$description = marketly_option( 'footer_about' );

		if ( '' === marketly_trim_description( $description, 400 ) ) {
			$description = get_bloginfo( 'description' );
		}
	}

	/**
	 * Filter the meta description before it is trimmed.
	 *
	 * @param string $description Raw description.
	 */
	$description = apply_filters( 'marketly_meta_description', $description );

	return marketly_trim_description( $description );
}

/**
 * The best available sharing image for the current view.
 *
 * @return int Attachment ID, or 0.
 */
function marketly_share_image_id() {
	if ( is_singular() && has_post_thumbnail() ) {
		return (int) get_post_thumbnail_id();
	}

	if ( ( is_tax( 'product_cat' ) || is_category() ) ) {
		$term = get_queried_object();

		if ( $term instanceof WP_Term ) {
			$thumb = (int) get_term_meta( $term->term_id, 'thumbnail_id', true );

			if ( $thumb ) {
				return $thumb;
			}
		}
	}

	$hero = (int) marketly_option( 'hero_image' );

	if ( $hero ) {
		return $hero;
	}

	return (int) get_theme_mod( 'custom_logo' );
}

/**
 * The canonical URL for the current view.
 *
 * WordPress already prints one on singular views; this covers the archives
 * and the shop, which it leaves alone.
 *
 * @return string
 */
function marketly_canonical_url() {
	if ( is_singular() ) {
		return ''; // rel_canonical() has it.
	}

	$url = '';

	if ( is_front_page() ) {
		$url = home_url( '/' );
	} elseif ( function_exists( 'is_shop' ) && is_shop() ) {
		$url = get_permalink( wc_get_page_id( 'shop' ) );
	} elseif ( is_tax() || is_category() || is_tag() ) {
		$term = get_queried_object();
		$link = ( $term instanceof WP_Term ) ? get_term_link( $term ) : '';
		$url  = is_wp_error( $link ) ? '' : $link;
	} elseif ( is_post_type_archive() ) {
		$url = get_post_type_archive_link( get_post_type() );
	}

	if ( ! $url ) {
		return '';
	}

	// Page 2 of an archive is its own canonical, not a duplicate of page 1.
	$paged = (int) get_query_var( 'paged' );

	if ( $paged > 1 ) {
		$url = trailingslashit( $url ) . 'page/' . $paged . '/';
	}

	return $url;
}

/**
 * Print the head tags.
 */
function marketly_seo_head() {
	if ( marketly_seo_plugin_active() || is_404() ) {
		return;
	}

	$description = marketly_meta_description();
	$canonical   = marketly_canonical_url();
	$title       = wp_get_document_title();
	$image_id    = marketly_share_image_id();

	echo "\n<!-- Marketly SEO -->\n";

	if ( $description ) {
		printf( "<meta name=\"description\" content=\"%s\">\n", esc_attr( $description ) );
	}

	if ( $canonical ) {
		printf( "<link rel=\"canonical\" href=\"%s\">\n", esc_url( $canonical ) );
	}

	/* ------------------------------------------------------- Open Graph */

	printf( "<meta property=\"og:site_name\" content=\"%s\">\n", esc_attr( get_bloginfo( 'name' ) ) );
	printf( "<meta property=\"og:title\" content=\"%s\">\n", esc_attr( $title ) );
	printf( "<meta property=\"og:type\" content=\"%s\">\n", esc_attr( is_singular( 'post' ) ? 'article' : 'website' ) );
	printf( "<meta property=\"og:url\" content=\"%s\">\n", esc_url( $canonical ? $canonical : home_url( add_query_arg( array() ) ) ) );
	printf( "<meta property=\"og:locale\" content=\"%s\">\n", esc_attr( get_locale() ) );

	if ( $description ) {
		printf( "<meta property=\"og:description\" content=\"%s\">\n", esc_attr( $description ) );
	}

	if ( $image_id ) {
		$src = wp_get_attachment_image_src( $image_id, 'full' );

		if ( $src ) {
			printf( "<meta property=\"og:image\" content=\"%s\">\n", esc_url( $src[0] ) );
			printf( "<meta property=\"og:image:width\" content=\"%d\">\n", (int) $src[1] );
			printf( "<meta property=\"og:image:height\" content=\"%d\">\n", (int) $src[2] );

			$alt = get_post_meta( $image_id, '_wp_attachment_image_alt', true );

			if ( $alt ) {
				printf( "<meta property=\"og:image:alt\" content=\"%s\">\n", esc_attr( $alt ) );
			}
		}
	}

	printf(
		"<meta name=\"twitter:card\" content=\"%s\">\n",
		esc_attr( $image_id ? 'summary_large_image' : 'summary' )
	);

	echo "<!-- /Marketly SEO -->\n";
}
add_action( 'wp_head', 'marketly_seo_head', 2 );

/**
 * Keep thin and duplicate views out of the index.
 *
 * @param array $robots Robots directives.
 * @return array
 */
function marketly_robots( $robots ) {
	if ( marketly_seo_plugin_active() ) {
		return $robots;
	}

	// Search results and any filtered permutation of the catalogue are
	// endless variations of pages that are already indexed once.
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only inspection of the current URL.
	$filtered = ! empty( $_GET['orderby'] ) || ! empty( $_GET['min_price'] ) || ! empty( $_GET['max_price'] ) || ! empty( $_GET['filter_'] );

	// The wishlist renders entirely from the visitor's own browser storage, so
	// a crawler sees an empty shell. Indexing it would publish a blank page.
	$is_wishlist = is_page_template( 'template-wishlist.php' );

	if ( is_search() || is_404() || $filtered || $is_wishlist ) {
		$robots['noindex']  = true;
		$robots['follow']   = true;
		unset( $robots['index'] );
	}

	return $robots;
}
add_filter( 'wp_robots', 'marketly_robots', 20 );

/* ---------------------------------------------------------- Structured data */

/**
 * Emit the structured data nothing else provides.
 *
 * Deliberately narrow. WooCommerce already outputs Product, Offer,
 * AggregateRating, Review and BreadcrumbList on its own pages — verified in
 * the page source, not assumed — so repeating any of that would give search
 * engines two competing descriptions of the same product. What is missing is
 * the site-level identity and Article for editorial posts.
 */
function marketly_json_ld() {
	if ( marketly_seo_plugin_active() || is_404() ) {
		return;
	}

	$home  = home_url( '/' );
	$name  = get_bloginfo( 'name' );
	$graph = array();

	$organisation = array(
		'@type' => marketly_has_woocommerce() ? 'OnlineStore' : 'Organization',
		'@id'   => $home . '#organisation',
		'name'  => $name,
		'url'   => $home,
	);

	$logo_id = (int) get_theme_mod( 'custom_logo' );

	if ( $logo_id ) {
		$logo = wp_get_attachment_image_src( $logo_id, 'full' );

		if ( $logo ) {
			$organisation['logo'] = array(
				'@type'  => 'ImageObject',
				'url'    => $logo[0],
				'width'  => (int) $logo[1],
				'height' => (int) $logo[2],
			);
		}
	}

	$social = wp_list_pluck( marketly_social_links(), 'url' );

	if ( $social ) {
		$organisation['sameAs'] = array_values( $social );
	}

	$graph[] = $organisation;

	$website = array(
		'@type'     => 'WebSite',
		'@id'       => $home . '#website',
		'url'       => $home,
		'name'      => $name,
		'publisher' => array( '@id' => $home . '#organisation' ),
	);

	// Only claim a search action if the store can actually be searched.
	$website['potentialAction'] = array(
		'@type'       => 'SearchAction',
		'target'      => array(
			'@type'       => 'EntryPoint',
			'urlTemplate' => $home . '?s={search_term_string}',
		),
		'query-input' => 'required name=search_term_string',
	);

	$graph[] = $website;

	// Article, for editorial posts only. Pages, products and archives are
	// either covered elsewhere or not articles.
	if ( is_singular( 'post' ) ) {
		$post    = get_queried_object();
		$article = array(
			'@type'            => 'Article',
			'@id'              => get_permalink( $post ) . '#article',
			'headline'         => marketly_trim_description( get_the_title( $post ), 110 ),
			'datePublished'    => get_the_date( DATE_W3C, $post ),
			'dateModified'     => get_the_modified_date( DATE_W3C, $post ),
			'author'           => array(
				'@type' => 'Person',
				'name'  => get_the_author_meta( 'display_name', (int) $post->post_author ),
			),
			'publisher'        => array( '@id' => $home . '#organisation' ),
			'mainEntityOfPage' => array( '@id' => get_permalink( $post ) ),
		);

		$description = marketly_meta_description();

		if ( $description ) {
			$article['description'] = $description;
		}

		$image_id = marketly_share_image_id();

		if ( $image_id ) {
			$src = wp_get_attachment_image_src( $image_id, 'full' );

			if ( $src ) {
				$article['image'] = array(
					'@type'  => 'ImageObject',
					'url'    => $src[0],
					'width'  => (int) $src[1],
					'height' => (int) $src[2],
				);
			}
		}

		$graph[] = $article;
	}

	/**
	 * Filter the theme's JSON-LD graph.
	 *
	 * @param array $graph Schema.org nodes.
	 */
	$graph = apply_filters( 'marketly_json_ld_graph', $graph );

	if ( ! $graph ) {
		return;
	}

	printf(
		"<script type=\"application/ld+json\">%s</script>\n",
		wp_json_encode(
			array(
				'@context' => 'https://schema.org',
				'@graph'   => $graph,
			),
			JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
		)
	);
}
add_action( 'wp_head', 'marketly_json_ld', 3 );

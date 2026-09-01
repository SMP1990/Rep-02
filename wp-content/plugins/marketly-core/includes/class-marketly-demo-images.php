<?php
/**
 * Demo artwork, drawn at import time.
 *
 * The demo products need pictures, and there are only bad ways to ship real
 * ones: bundling photography means licensing it and carrying megabytes in the
 * plugin, and fetching it at import time means the importer fails on any site
 * without outbound network access.
 *
 * So the images are drawn here with GD instead — flat, modern placeholder
 * illustrations, a few kilobytes each, generated offline. They are meant to be
 * replaced with the shop's own photography.
 *
 * @package Marketly_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Draws the placeholder artwork used by the demo importer.
 */
class Marketly_Demo_Images {

	/**
	 * Whether the server can draw at all.
	 *
	 * @return bool
	 */
	public static function supported() {
		return function_exists( 'imagecreatetruecolor' ) && function_exists( 'imagejpeg' );
	}

	/**
	 * Turn a hex colour into an allocated GD colour.
	 *
	 * @param resource|GdImage $image GD image.
	 * @param string           $hex   Hex colour.
	 * @return int
	 */
	private static function colour( $image, $hex ) {
		$hex = ltrim( (string) $hex, '#' );

		return imagecolorallocate(
			$image,
			(int) hexdec( substr( $hex, 0, 2 ) ),
			(int) hexdec( substr( $hex, 2, 2 ) ),
			(int) hexdec( substr( $hex, 4, 2 ) )
		);
	}

	/**
	 * Mix two hex colours.
	 *
	 * @param string $a      First colour.
	 * @param string $b      Second colour.
	 * @param float  $amount 0 returns $a, 1 returns $b.
	 * @return string Hex colour.
	 */
	private static function mix( $a, $b, $amount ) {
		$a   = ltrim( (string) $a, '#' );
		$b   = ltrim( (string) $b, '#' );
		$out = '';

		for ( $i = 0; $i < 3; $i++ ) {
			$ca   = (int) hexdec( substr( $a, $i * 2, 2 ) );
			$cb   = (int) hexdec( substr( $b, $i * 2, 2 ) );
			$out .= str_pad( dechex( (int) round( $ca + ( ( $cb - $ca ) * $amount ) ) ), 2, '0', STR_PAD_LEFT );
		}

		return $out;
	}

	/**
	 * Paint a soft vertical gradient across the whole canvas.
	 *
	 * @param resource|GdImage $image  GD image.
	 * @param int              $width  Canvas width.
	 * @param int              $height Canvas height.
	 * @param string           $top    Top colour.
	 * @param string           $bottom Bottom colour.
	 */
	private static function gradient( $image, $width, $height, $top, $bottom ) {
		for ( $y = 0; $y < $height; $y++ ) {
			$shade = self::colour( $image, self::mix( $top, $bottom, $y / max( 1, $height - 1 ) ) );
			imagefilledrectangle( $image, 0, $y, $width, $y, $shade );
		}
	}

	/**
	 * A soft contact shadow beneath the subject.
	 *
	 * @param resource|GdImage $image GD image.
	 * @param int              $cx    Centre x.
	 * @param int              $cy    Centre y.
	 * @param int              $w     Width.
	 */
	private static function shadow( $image, $cx, $cy, $w ) {
		for ( $i = 6; $i > 0; $i-- ) {
			$alpha = 108 + ( $i * 4 );
			$shade = imagecolorallocatealpha( $image, 30, 35, 45, min( 127, $alpha ) );
			imagefilledellipse( $image, $cx, $cy, (int) ( $w * ( 0.55 + ( $i * 0.03 ) ) ), (int) ( $w * 0.11 ), $shade );
		}
	}

	/**
	 * A rounded rectangle.
	 *
	 * @param resource|GdImage $image  GD image.
	 * @param int              $x1     Left.
	 * @param int              $y1     Top.
	 * @param int              $x2     Right.
	 * @param int              $y2     Bottom.
	 * @param int              $radius Corner radius.
	 * @param int              $fill   Allocated colour.
	 */
	private static function rounded( $image, $x1, $y1, $x2, $y2, $radius, $fill ) {
		imagefilledrectangle( $image, $x1 + $radius, $y1, $x2 - $radius, $y2, $fill );
		imagefilledrectangle( $image, $x1, $y1 + $radius, $x2, $y2 - $radius, $fill );

		$d = $radius * 2;
		imagefilledellipse( $image, $x1 + $radius, $y1 + $radius, $d, $d, $fill );
		imagefilledellipse( $image, $x2 - $radius, $y1 + $radius, $d, $d, $fill );
		imagefilledellipse( $image, $x1 + $radius, $y2 - $radius, $d, $d, $fill );
		imagefilledellipse( $image, $x2 - $radius, $y2 - $radius, $d, $d, $fill );
	}

	/**
	 * Draw one product illustration and return it as JPEG bytes.
	 *
	 * @param string $shape  Shape key.
	 * @param string $tint   Background tint, hex.
	 * @param string $subject Subject colour, hex.
	 * @param int    $size   Square canvas size.
	 * @return string|false JPEG bytes.
	 */
	public static function product( $shape, $tint, $subject, $size = 900 ) {
		if ( ! self::supported() ) {
			return false;
		}

		$image = imagecreatetruecolor( $size, $size );
		imagealphablending( $image, true );

		self::gradient( $image, $size, $size, '#ffffff', $tint );

		$c   = self::colour( $image, $subject );
		$lit = self::colour( $image, self::mix( $subject, '#ffffff', 0.28 ) );
		$dim = self::colour( $image, self::mix( $subject, '#000000', 0.22 ) );
		$mid = (int) ( $size / 2 );
		$u   = $size / 100; // One percent, so every shape scales with the canvas.

		self::shadow( $image, $mid, (int) ( $size * 0.80 ), (int) ( $size * 0.62 ) );

		switch ( $shape ) {
			case 'slab': // Phones, tablets, e-readers.
				self::rounded( $image, (int) ( $mid - 20 * $u ), (int) ( 14 * $u ), (int) ( $mid + 20 * $u ), (int) ( 76 * $u ), (int) ( 5 * $u ), $c );
				self::rounded( $image, (int) ( $mid - 16 * $u ), (int) ( 19 * $u ), (int) ( $mid + 16 * $u ), (int) ( 71 * $u ), (int) ( 3 * $u ), $lit );
				break;

			case 'watch': // A squarer body with straps, so it does not read as a phone.
				self::rounded( $image, (int) ( $mid - 9 * $u ), (int) ( 18 * $u ), (int) ( $mid + 9 * $u ), (int) ( 38 * $u ), (int) ( 4 * $u ), $dim );
				self::rounded( $image, (int) ( $mid - 9 * $u ), (int) ( 62 * $u ), (int) ( $mid + 9 * $u ), (int) ( 82 * $u ), (int) ( 4 * $u ), $dim );
				self::rounded( $image, (int) ( $mid - 19 * $u ), (int) ( 32 * $u ), (int) ( $mid + 19 * $u ), (int) ( 68 * $u ), (int) ( 8 * $u ), $c );
				self::rounded( $image, (int) ( $mid - 15 * $u ), (int) ( 36 * $u ), (int) ( $mid + 15 * $u ), (int) ( 64 * $u ), (int) ( 6 * $u ), $lit );
				imagefilledrectangle( $image, (int) ( $mid + 19 * $u ), (int) ( 44 * $u ), (int) ( $mid + 22 * $u ), (int) ( 52 * $u ), $dim );
				break;

			case 'laptop':
				self::rounded( $image, (int) ( $mid - 32 * $u ), (int) ( 24 * $u ), (int) ( $mid + 32 * $u ), (int) ( 60 * $u ), (int) ( 3 * $u ), $c );
				self::rounded( $image, (int) ( $mid - 28 * $u ), (int) ( 28 * $u ), (int) ( $mid + 28 * $u ), (int) ( 56 * $u ), (int) ( 2 * $u ), $lit );
				self::rounded( $image, (int) ( $mid - 40 * $u ), (int) ( 61 * $u ), (int) ( $mid + 40 * $u ), (int) ( 68 * $u ), (int) ( 3 * $u ), $dim );
				break;

			case 'orb': // Headphones, pans, round goods.
				imagefilledellipse( $image, $mid, (int) ( $size * 0.46 ), (int) ( 54 * $u ), (int) ( 54 * $u ), $c );
				imagefilledellipse( $image, $mid, (int) ( $size * 0.42 ), (int) ( 34 * $u ), (int) ( 34 * $u ), $lit );
				break;

			case 'pair': // Earbuds, dumbbells, anything symmetrical.
				imagefilledellipse( $image, (int) ( $mid - 17 * $u ), (int) ( $size * 0.47 ), (int) ( 30 * $u ), (int) ( 38 * $u ), $c );
				imagefilledellipse( $image, (int) ( $mid + 17 * $u ), (int) ( $size * 0.47 ), (int) ( 30 * $u ), (int) ( 38 * $u ), $c );
				imagefilledellipse( $image, (int) ( $mid - 17 * $u ), (int) ( $size * 0.43 ), (int) ( 16 * $u ), (int) ( 20 * $u ), $lit );
				imagefilledellipse( $image, (int) ( $mid + 17 * $u ), (int) ( $size * 0.43 ), (int) ( 16 * $u ), (int) ( 20 * $u ), $lit );
				break;

			case 'tube': // Lipstick, serum, perfume, bottles.
				self::rounded( $image, (int) ( $mid - 11 * $u ), (int) ( 30 * $u ), (int) ( $mid + 11 * $u ), (int) ( 76 * $u ), (int) ( 4 * $u ), $c );
				self::rounded( $image, (int) ( $mid - 7 * $u ), (int) ( 16 * $u ), (int) ( $mid + 7 * $u ), (int) ( 33 * $u ), (int) ( 3 * $u ), $dim );
				self::rounded( $image, (int) ( $mid - 5 * $u ), (int) ( 40 * $u ), (int) ( $mid - 1 * $u ), (int) ( 66 * $u ), (int) ( 2 * $u ), $lit );
				break;

			case 'seat': // Sofas, chairs, upholstered things.
				self::rounded( $image, (int) ( $mid - 38 * $u ), (int) ( 38 * $u ), (int) ( $mid + 38 * $u ), (int) ( 64 * $u ), (int) ( 6 * $u ), $c );
				self::rounded( $image, (int) ( $mid - 34 * $u ), (int) ( 30 * $u ), (int) ( $mid + 34 * $u ), (int) ( 48 * $u ), (int) ( 6 * $u ), $lit );
				imagefilledrectangle( $image, (int) ( $mid - 32 * $u ), (int) ( 64 * $u ), (int) ( $mid - 26 * $u ), (int) ( 72 * $u ), $dim );
				imagefilledrectangle( $image, (int) ( $mid + 26 * $u ), (int) ( 64 * $u ), (int) ( $mid + 32 * $u ), (int) ( 72 * $u ), $dim );
				break;

			case 'basket': // Bags, baskets, tapered vessels.
				$poly = array(
					(int) ( $mid - 32 * $u ),
					(int) ( 34 * $u ),
					(int) ( $mid + 32 * $u ),
					(int) ( 34 * $u ),
					(int) ( $mid + 24 * $u ),
					(int) ( 74 * $u ),
					(int) ( $mid - 24 * $u ),
					(int) ( 74 * $u ),
				);
				imagefilledpolygon( $image, $poly, $c );
				self::rounded( $image, (int) ( $mid - 34 * $u ), (int) ( 30 * $u ), (int) ( $mid + 34 * $u ), (int) ( 38 * $u ), (int) ( 3 * $u ), $dim );
				imagearc( $image, $mid, (int) ( 32 * $u ), (int) ( 34 * $u ), (int) ( 34 * $u ), 180, 360, $dim );
				break;

			case 'shoe':
				$poly = array(
					(int) ( $mid - 36 * $u ),
					(int) ( 66 * $u ),
					(int) ( $mid - 30 * $u ),
					(int) ( 44 * $u ),
					(int) ( $mid - 6 * $u ),
					(int) ( 44 * $u ),
					(int) ( $mid + 14 * $u ),
					(int) ( 56 * $u ),
					(int) ( $mid + 36 * $u ),
					(int) ( 62 * $u ),
					(int) ( $mid + 36 * $u ),
					(int) ( 68 * $u ),
					(int) ( $mid - 36 * $u ),
					(int) ( 68 * $u ),
				);
				imagefilledpolygon( $image, $poly, $c );
				imagefilledrectangle( $image, (int) ( $mid - 36 * $u ), (int) ( 68 * $u ), (int) ( $mid + 36 * $u ), (int) ( 73 * $u ), $dim );
				imagefilledellipse( $image, (int) ( $mid - 14 * $u ), (int) ( 52 * $u ), (int) ( 22 * $u ), (int) ( 12 * $u ), $lit );
				break;

			case 'lamp':
				$poly = array(
					(int) ( $mid - 24 * $u ),
					(int) ( 46 * $u ),
					(int) ( $mid + 24 * $u ),
					(int) ( 46 * $u ),
					(int) ( $mid + 15 * $u ),
					(int) ( 20 * $u ),
					(int) ( $mid - 15 * $u ),
					(int) ( 20 * $u ),
				);
				imagefilledpolygon( $image, $poly, $c );
				imagefilledrectangle( $image, (int) ( $mid - 2 * $u ), (int) ( 46 * $u ), (int) ( $mid + 2 * $u ), (int) ( 70 * $u ), $dim );
				self::rounded( $image, (int) ( $mid - 16 * $u ), (int) ( 70 * $u ), (int) ( $mid + 16 * $u ), (int) ( 75 * $u ), (int) ( 2 * $u ), $dim );
				break;

			case 'garment': // Jackets, shirts, folded textiles.
				$poly = array(
					(int) ( $mid - 30 * $u ),
					(int) ( 30 * $u ),
					(int) ( $mid - 12 * $u ),
					(int) ( 22 * $u ),
					(int) ( $mid + 12 * $u ),
					(int) ( 22 * $u ),
					(int) ( $mid + 30 * $u ),
					(int) ( 30 * $u ),
					(int) ( $mid + 26 * $u ),
					(int) ( 74 * $u ),
					(int) ( $mid - 26 * $u ),
					(int) ( 74 * $u ),
				);
				imagefilledpolygon( $image, $poly, $c );
				imagefilledrectangle( $image, (int) ( $mid - 3 * $u ), (int) ( 24 * $u ), (int) ( $mid + 3 * $u ), (int) ( 74 * $u ), $dim );
				break;

			case 'glasses':
				imagefilledellipse( $image, (int) ( $mid - 20 * $u ), (int) ( 50 * $u ), (int) ( 30 * $u ), (int) ( 24 * $u ), $c );
				imagefilledellipse( $image, (int) ( $mid + 20 * $u ), (int) ( 50 * $u ), (int) ( 30 * $u ), (int) ( 24 * $u ), $c );
				imagefilledrectangle( $image, (int) ( $mid - 6 * $u ), (int) ( 48 * $u ), (int) ( $mid + 6 * $u ), (int) ( 52 * $u ), $dim );
				break;

			default: // A generic block, so an unknown key still draws something.
				self::rounded( $image, (int) ( $mid - 28 * $u ), (int) ( 28 * $u ), (int) ( $mid + 28 * $u ), (int) ( 72 * $u ), (int) ( 6 * $u ), $c );
				break;
		}

		ob_start();
		imagejpeg( $image, null, 86 );
		$bytes = ob_get_clean();
		imagedestroy( $image );

		return $bytes;
	}

	/**
	 * A wide banner for the hero and promotion slots.
	 *
	 * @param string $from  Gradient start.
	 * @param string $to    Gradient end.
	 * @param string $tint  Subject colour.
	 * @param int    $width Canvas width.
	 * @return string|false JPEG bytes.
	 */
	public static function banner( $from, $to, $tint, $width = 1400 ) {
		if ( ! self::supported() ) {
			return false;
		}

		$height = (int) round( $width * 0.64 );
		$image  = imagecreatetruecolor( $width, $height );
		imagealphablending( $image, true );

		self::gradient( $image, $width, $height, $from, $to );

		// A loose arrangement of shapes, so the banner reads as a scene
		// rather than a flat swatch.
		$subject = self::colour( $image, $tint );
		$light   = self::colour( $image, self::mix( $tint, '#ffffff', 0.35 ) );
		$deep    = self::colour( $image, self::mix( $tint, '#000000', 0.18 ) );

		self::shadow( $image, (int) ( $width * 0.5 ), (int) ( $height * 0.82 ), (int) ( $width * 0.5 ) );

		imagefilledellipse( $image, (int) ( $width * 0.44 ), (int) ( $height * 0.5 ), (int) ( $width * 0.30 ), (int) ( $width * 0.30 ), $subject );
		self::rounded( $image, (int) ( $width * 0.60 ), (int) ( $height * 0.34 ), (int) ( $width * 0.76 ), (int) ( $height * 0.74 ), (int) ( $width * 0.02 ), $light );
		imagefilledellipse( $image, (int) ( $width * 0.28 ), (int) ( $height * 0.64 ), (int) ( $width * 0.13 ), (int) ( $width * 0.13 ), $deep );

		ob_start();
		imagejpeg( $image, null, 88 );
		$bytes = ob_get_clean();
		imagedestroy( $image );

		return $bytes;
	}

	/**
	 * A round avatar for testimonials.
	 *
	 * @param string $tint Background tint.
	 * @param string $skin Figure colour.
	 * @param int    $size Canvas size.
	 * @return string|false JPEG bytes.
	 */
	public static function avatar( $tint, $skin, $size = 320 ) {
		if ( ! self::supported() ) {
			return false;
		}

		$image = imagecreatetruecolor( $size, $size );
		self::gradient( $image, $size, $size, self::mix( $tint, '#ffffff', 0.4 ), $tint );

		$figure = self::colour( $image, $skin );
		imagefilledellipse( $image, (int) ( $size / 2 ), (int) ( $size * 0.38 ), (int) ( $size * 0.34 ), (int) ( $size * 0.34 ), $figure );
		imagefilledellipse( $image, (int) ( $size / 2 ), (int) ( $size * 1.02 ), (int) ( $size * 0.72 ), (int) ( $size * 0.78 ), $figure );

		ob_start();
		imagejpeg( $image, null, 86 );
		$bytes = ob_get_clean();
		imagedestroy( $image );

		return $bytes;
	}
}

<?php
/**
 * Closing of the page shell, footer and the fixed mobile tab bar.
 *
 * Phase 1 provides the shell only. The footer columns and the bottom tab bar
 * are added in Phase 2.
 *
 * @package Marketly
 */

defined( 'ABSPATH' ) || exit;
?>
	</main><!-- #main -->

	<footer class="site-footer" id="site-footer">
		<?php
		/**
		 * Footer contents.
		 *
		 * Phase 2 hooks the footer columns and legal row here.
		 */
		do_action( 'marketly_footer' );
		?>
	</footer>

	<?php
	/**
	 * Off-canvas panels and the fixed bottom tab bar, added in Phase 2.
	 */
	do_action( 'marketly_after_footer' );
	?>

</div><!-- #site -->

<?php wp_footer(); ?>
</body>
</html>

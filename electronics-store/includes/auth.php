<?php
/**
 * Admin session guard — reserved for Phase 2.
 *
 * Will be require_once'd at the top of every admin/*.php page to enforce
 * an authenticated session and redirect to admin/login.php otherwise.
 * Left unimplemented deliberately: no auth/business logic in this
 * structure-and-wireframe phase.
 */

// TODO (Phase 2): session_start(), verify $_SESSION['admin_id'], redirect
// to login.php if missing, CSRF token helpers, login throttling.

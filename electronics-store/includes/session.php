<?php
/**
 * Session bootstrap — required by every public and admin page that reads
 * or writes $_SESSION (cart, flash messages, CSRF tokens, admin login).
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

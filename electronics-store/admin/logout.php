<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/auth.php';

admin_logout();
redirect('/electronics-store/admin/login.php');

<?php
require_once __DIR__ . '/app/bootstrap.php';
$list_id = (int)($_GET['list_id'] ?? 1);
unset($_SESSION['auth_lists'][$list_id]);
header('Location: login.php?list_id=' . $list_id);
exit;

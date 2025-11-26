<?php
// app/bootstrap.php
declare(strict_types=1);
mb_internal_encoding('UTF-8');
error_reporting(E_ALL);
ini_set('display_errors', '0');

$cfg = require __DIR__ . '/Config/config.php';
@date_default_timezone_set($cfg['app']['timezone'] ?? 'Europe/Athens');

session_start();
require_once __DIR__ . '/Lib/DB.php';
require_once __DIR__ . '/Lib/Tenancy.php';

function ensure_migrated(): void {
  $pdo = DB::conn();
  // 001 - αρχικοί πίνακες
  try { $pdo->query('SELECT 1 FROM lists LIMIT 1'); }
  catch (Throwable $e) {
    $sql = file_get_contents(__DIR__ . '/migrations/001_init.sql');
    $pdo->exec($sql);
  }
  // 002 - στήλες για auth
  ensure_auth_column($pdo);
  // 003 - στήλες για priority/tags
  ensure_task_enhancements($pdo);
  // 004 notes table
  ensure_task_notes($pdo);
  // 005 - start/due dates
  ensure_task_dates($pdo);
  // 006 - multi-tenant scaffolding
  ensure_tenancy_schema($pdo);
  ensure_default_roles($pdo);
  ensure_default_tenant($pdo);
}

function ensure_task_notes(PDO $pdo): void {
  try { $pdo->query('SELECT 1 FROM task_notes LIMIT 1'); }
  catch (Throwable $e) {
    $pdo->exec("
      CREATE TABLE task_notes (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        task_id INT UNSIGNED NOT NULL,
        body TEXT NOT NULL,
        author VARCHAR(191) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_task_notes_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
  }
}

function ensure_auth_column(PDO $pdo): void {
  try { $pdo->query('SELECT access_hash FROM lists LIMIT 1'); }
  catch (Throwable $e) { $pdo->exec("ALTER TABLE lists ADD COLUMN access_hash VARCHAR(255) NULL AFTER materials"); }
}

function ensure_task_enhancements(PDO $pdo): void {
  // priority (1=High,2=Med,3=Low), tags (CSV)
  try { $pdo->query('SELECT priority FROM tasks LIMIT 1'); }
  catch (Throwable $e) { $pdo->exec("ALTER TABLE tasks ADD COLUMN priority TINYINT NOT NULL DEFAULT 2 AFTER position"); }
  try { $pdo->query('SELECT tags FROM tasks LIMIT 1'); }
  catch (Throwable $e) { $pdo->exec("ALTER TABLE tasks ADD COLUMN tags VARCHAR(255) NULL AFTER priority"); }
}

function ensure_task_dates(PDO $pdo): void {
  $col = $pdo->query("SHOW COLUMNS FROM tasks LIKE 'start_date'")->fetch(PDO::FETCH_ASSOC);
  if (!$col) {
    $pdo->exec("ALTER TABLE tasks ADD COLUMN start_date DATETIME NULL AFTER tags");
  } elseif (stripos((string)$col['Type'], 'datetime') === false) {
    $pdo->exec("ALTER TABLE tasks MODIFY start_date DATETIME NULL");
  }

  $col = $pdo->query("SHOW COLUMNS FROM tasks LIKE 'due_date'")->fetch(PDO::FETCH_ASSOC);
  if (!$col) {
    $pdo->exec("ALTER TABLE tasks ADD COLUMN due_date DATETIME NULL AFTER start_date");
  } elseif (stripos((string)$col['Type'], 'datetime') === false) {
    $pdo->exec("ALTER TABLE tasks MODIFY due_date DATETIME NULL");
  }
}

function csrf_token(): string {
  $cfg = require __DIR__ . '/Config/config.php';
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
  return hash('sha256', $_SESSION['csrf'] . '|' . ($cfg['security']['secret'] ?? ''));
}
function require_csrf(): void {
  if ($_SERVER['REQUEST_METHOD'] === 'GET') return;
  $hdr = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  if (!$hdr || !hash_equals(csrf_token(), $hdr)) {
    http_response_code(419);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['ok'=>false,'error'=>'Invalid CSRF token']); exit;
  }
}

/* ========= AUTH ========= */
function is_authed(int $list_id = 1): bool { return !empty($_SESSION['auth_lists'][$list_id]); }
function require_auth(int $list_id = 1): void {
  if (is_authed($list_id)) {
    // bind the legacy session to the tenant owning this list
    $pdo = DB::conn();
    $_SESSION['tenant_id'] = list_tenant_id($pdo, $list_id);
    return;
  }
  if (basename($_SERVER['SCRIPT_NAME']) === 'api.php') {
    http_response_code(401); header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit;
  }
  header('Location: login.php?list_id=' . (int)$list_id); exit;
}
function verify_password(int $list_id, string $password): bool {
  $pdo = DB::conn();
  $st = $pdo->prepare('SELECT access_hash FROM lists WHERE id=?'); $st->execute([$list_id]);
  $hash = (string)$st->fetchColumn(); if ($hash === '' || $hash === null) return false;
  return password_verify($password, $hash);
}
function set_password(int $list_id, string $password): void {
  $pdo = DB::conn();
  $hash = password_hash($password, PASSWORD_DEFAULT);
  $pdo->prepare('UPDATE lists SET access_hash=? WHERE id=?')->execute([$hash, $list_id]);
}

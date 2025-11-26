<?php
require_once __DIR__ . '/app/bootstrap.php';
ensure_migrated();
header('Content-Type: application/json; charset=UTF-8');

$action = $_GET['action'] ?? '';

function j($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function require_method(string $method): void {
  if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== strtoupper($method)) {
    j(['ok' => false, 'error' => 'Method Not Allowed'], 405);
  }
}

try {
  $pdo = DB::conn();

  switch ($action) {
    case 'login': {
      require_method('POST');
      $body = json_decode(file_get_contents('php://input'), true) ?: [];
      $email = strtolower(trim((string)($body['email'] ?? '')));
      $password = (string)($body['password'] ?? '');
      $tenantSlug = trim((string)($body['tenant'] ?? 'default'));

      if ($email === '' || $password === '') {
        j(['ok' => false, 'error' => 'Email and password are required.'], 400);
      }

      $tenantStmt = $pdo->prepare('SELECT id,name,slug,plan,status FROM tenants WHERE slug=?');
      $tenantStmt->execute([$tenantSlug]);
      $tenant = $tenantStmt->fetch();
      if (!$tenant) j(['ok' => false, 'error' => 'Tenant not found.'], 404);

      $userStmt = $pdo->prepare('SELECT id, tenant_id, email, display_name, password_hash, status FROM users WHERE tenant_id=? AND email=?');
      $userStmt->execute([(int)$tenant['id'], $email]);
      $user = $userStmt->fetch();

      if (!$user || !password_verify($password, (string)$user['password_hash'])) {
        j(['ok' => false, 'error' => 'Invalid email or password.'], 401);
      }

      if (($user['status'] ?? '') !== 'active') {
        j(['ok' => false, 'error' => 'Account is disabled for this workspace.'], 403);
      }

      $rolesStmt = $pdo->prepare('SELECT r.slug FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=? ORDER BY r.slug');
      $rolesStmt->execute([(int)$user['id']]);
      $roles = array_map(fn($r) => $r['slug'], $rolesStmt->fetchAll());

      set_user_session((int)$user['id'], (int)$tenant['id'], $roles);
      $subscription = tenant_subscription($pdo, (int)$tenant['id']);

      j([
        'ok' => true,
        'user' => [
          'id' => (int)$user['id'],
          'email' => $user['email'],
          'displayName' => $user['display_name'],
          'roles' => $roles,
        ],
        'tenant' => [
          'id' => (int)$tenant['id'],
          'name' => $tenant['name'],
          'slug' => $tenant['slug'],
          'plan' => $tenant['plan'],
          'status' => $tenant['status'],
        ],
        'subscription' => $subscription,
        'csrf' => csrf_token(),
      ]);
    }

    case 'me': {
      require_method('GET');
      $user = require_user($pdo);
      $tenantStmt = $pdo->prepare('SELECT id,name,slug,plan,status FROM tenants WHERE id=?');
      $tenantStmt->execute([(int)$user['tenant_id']]);
      $tenant = $tenantStmt->fetch();
      $subscription = tenant_subscription($pdo, (int)$user['tenant_id']);

      j([
        'ok' => true,
        'user' => [
          'id' => (int)$user['id'],
          'email' => $user['email'],
          'displayName' => $user['display_name'],
          'roles' => $user['roles'],
        ],
        'tenant' => $tenant,
        'subscription' => $subscription,
        'csrf' => csrf_token(),
      ]);
    }

    case 'logout': {
      require_method('POST');
      clear_user_session();
      j(['ok' => true]);
    }

    case 'layout_load': {
      require_method('GET');
      $user = require_user($pdo);
      $st = $pdo->prepare('SELECT layout FROM user_layouts WHERE user_id=? AND tenant_id=?');
      $st->execute([(int)$user['id'], (int)$user['tenant_id']]);
      $layout = $st->fetchColumn();
      j(['ok' => true, 'layout' => $layout ? json_decode((string)$layout, true) : null]);
    }

    case 'layout_save': {
      require_method('POST');
      $user = require_user($pdo);
      $body = json_decode(file_get_contents('php://input'), true) ?: [];
      $layout = $body['layout'] ?? [];
      if (!is_array($layout)) j(['ok' => false, 'error' => 'Layout must be an array'], 400);

      $payload = json_encode($layout, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
      $st = $pdo->prepare('INSERT INTO user_layouts(user_id, tenant_id, layout) VALUES(?,?,?) ON DUPLICATE KEY UPDATE layout=VALUES(layout)');
      $st->execute([(int)$user['id'], (int)$user['tenant_id'], $payload]);
      j(['ok' => true]);
    }

    case 'layout_clear': {
      require_method('POST');
      $user = require_user($pdo);
      $st = $pdo->prepare('DELETE FROM user_layouts WHERE user_id=? AND tenant_id=?');
      $st->execute([(int)$user['id'], (int)$user['tenant_id']]);
      j(['ok' => true]);
    }

    default:
      j(['ok' => false, 'error' => 'Unknown action'], 404);
  }
} catch (Throwable $e) {
  j(['ok' => false, 'error' => 'Server error', 'detail' => $e->getMessage()], 500);
}

#!/usr/bin/env php
<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

ensure_migrated();

// Simple CLI to create tenants and users for the SaaS setup.
$options = getopt('', [
  'tenant:',
  'email:',
  'name:',
  'password:',
  'roles::'
]);

if (!$options || empty($options['tenant']) || empty($options['email']) || empty($options['name']) || empty($options['password'])) {
  fwrite(STDERR, "Usage: php bin/create_user.php --tenant=slug --email=user@example.com --name=Display --password=Secret123 --roles=admin,member\n");
  exit(1);
}

$tenantSlug = trim((string)$options['tenant']);
$email      = strtolower(trim((string)$options['email']));
$name       = trim((string)$options['name']);
$password   = (string)$options['password'];
$rolesInput = isset($options['roles']) ? (string)$options['roles'] : 'admin';
$roleSlugs  = array_filter(array_map('trim', explode(',', $rolesInput)));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  fwrite(STDERR, "Invalid email format.\n");
  exit(1);
}

if (strlen($password) < 8) {
  fwrite(STDERR, "Password must be at least 8 characters.\n");
  exit(1);
}

$pdo = DB::conn();
$pdo->beginTransaction();

try {
  // Ensure base roles exist.
  ensure_default_roles($pdo);

  // Create or fetch tenant.
  $tenantStmt = $pdo->prepare('SELECT id, name, slug FROM tenants WHERE slug=?');
  $tenantStmt->execute([$tenantSlug]);
  $tenant = $tenantStmt->fetch(PDO::FETCH_ASSOC);

  if (!$tenant) {
    $pdo->prepare('INSERT INTO tenants(name, slug, plan, status) VALUES(?,?,?,?)')
      ->execute([$tenantSlug . ' Workspace', $tenantSlug, 'free', 'active']);
    $tenantId = (int)$pdo->lastInsertId();
  } else {
    $tenantId = (int)$tenant['id'];
  }

  // Upsert subscription to keep SaaS checks happy.
  $subStmt = $pdo->prepare('INSERT INTO tenant_subscriptions(tenant_id, plan, status) VALUES(?,?,?) ON DUPLICATE KEY UPDATE plan=VALUES(plan), status=VALUES(status)');
  $subStmt->execute([$tenantId, 'free', 'active']);

  // Create user.
  $userStmt = $pdo->prepare('SELECT id FROM users WHERE tenant_id=? AND email=?');
  $userStmt->execute([$tenantId, $email]);
  $userId = (int)($userStmt->fetchColumn() ?: 0);

  if ($userId) {
    fwrite(STDERR, "User already exists for this tenant.\n");
    $pdo->rollBack();
    exit(1);
  }

  $passwordHash = password_hash($password, PASSWORD_DEFAULT);
  $pdo->prepare('INSERT INTO users(tenant_id, email, display_name, password_hash, status) VALUES(?,?,?,?,?)')
    ->execute([$tenantId, $email, $name, $passwordHash, 'active']);
  $userId = (int)$pdo->lastInsertId();

  // Attach roles.
  $roleLookup = $pdo->prepare('SELECT id FROM roles WHERE slug=?');
  $assignRole = $pdo->prepare('INSERT INTO user_roles(user_id, role_id) VALUES(?,?)');
  foreach ($roleSlugs as $slug) {
    $roleLookup->execute([$slug]);
    $roleId = (int)($roleLookup->fetchColumn() ?: 0);
    if ($roleId) {
      $assignRole->execute([$userId, $roleId]);
    }
  }

  $pdo->commit();

  echo "User created successfully!\n";
  echo "Tenant: {$tenantSlug} (ID: {$tenantId})\n";
  echo "Email: {$email}\n";
  echo "Roles: " . implode(', ', $roleSlugs) . "\n";
} catch (Throwable $e) {
  $pdo->rollBack();
  fwrite(STDERR, 'Error: ' . $e->getMessage() . "\n");
  exit(1);
}

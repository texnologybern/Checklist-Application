<?php
// app/Lib/Tenancy.php

declare(strict_types=1);

function tenancy_table_exists(PDO $pdo, string $table): bool {
  try {
    $pdo->query("SELECT 1 FROM `$table` LIMIT 1");
    return true;
  } catch (Throwable $e) {
    return false;
  }
}

function tenancy_column_exists(PDO $pdo, string $table, string $column): bool {
  $st = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
  $st->execute([$column]);
  return (bool)$st->fetch();
}

function ensure_tenancy_schema(PDO $pdo): void {
  if (!tenancy_table_exists($pdo, 'tenants')) {
    $pdo->exec(<<<SQL
      CREATE TABLE tenants (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        slug VARCHAR(191) NOT NULL UNIQUE,
        status ENUM('active','past_due','canceled') NOT NULL DEFAULT 'active',
        plan VARCHAR(64) NOT NULL DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    SQL);
  }

  if (!tenancy_table_exists($pdo, 'roles')) {
    $pdo->exec(<<<SQL
      CREATE TABLE roles (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(191) NOT NULL,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    SQL);
  }

  if (!tenancy_table_exists($pdo, 'users')) {
    $pdo->exec(<<<SQL
      CREATE TABLE users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT UNSIGNED NOT NULL,
        email VARCHAR(191) NOT NULL,
        display_name VARCHAR(191) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        status ENUM('active','invited','disabled') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_email_per_tenant (tenant_id, email),
        INDEX idx_tenant_user (tenant_id),
        CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    SQL);
  }

  if (!tenancy_table_exists($pdo, 'user_roles')) {
    $pdo->exec(<<<SQL
      CREATE TABLE user_roles (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        role_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_role_user (role_id),
        INDEX idx_user_role (user_id),
        CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    SQL);
  }

  if (!tenancy_table_exists($pdo, 'tenant_subscriptions')) {
    $pdo->exec(<<<SQL
      CREATE TABLE tenant_subscriptions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT UNSIGNED NOT NULL,
        plan VARCHAR(64) NOT NULL DEFAULT 'free',
        status ENUM('active','past_due','canceled','trialing') NOT NULL DEFAULT 'active',
        seats INT UNSIGNED NOT NULL DEFAULT 1,
        ends_at DATETIME NULL,
        meta JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_subscription_tenant (tenant_id),
        CONSTRAINT fk_subscription_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    SQL);
  }

  if (!tenancy_table_exists($pdo, 'user_layouts')) {
    $pdo->exec(<<<SQL
      CREATE TABLE user_layouts (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        tenant_id INT UNSIGNED NOT NULL,
        layout JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_layout (user_id, tenant_id),
        INDEX idx_layout_tenant (tenant_id),
        CONSTRAINT fk_user_layout_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_layout_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    SQL);
  }

  if (!tenancy_column_exists($pdo, 'lists', 'tenant_id')) {
    $pdo->exec("ALTER TABLE lists ADD COLUMN tenant_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id");
    $pdo->exec("CREATE INDEX idx_lists_tenant ON lists(tenant_id)");
  }

  if (!tenancy_column_exists($pdo, 'tasks', 'tenant_id')) {
    $pdo->exec("ALTER TABLE tasks ADD COLUMN tenant_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id");
    $pdo->exec("CREATE INDEX idx_tasks_tenant ON tasks(tenant_id, list_id)");
  }

  // backfill existing rows to the default tenant
  $pdo->exec('UPDATE lists SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0');
  $pdo->exec('UPDATE tasks SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0');
}

function ensure_default_roles(PDO $pdo): void {
  $roles = [
    'admin' => 'Full access to manage the tenant, billing, and data.',
    'member' => 'Can collaborate on tasks and layouts within the tenant.',
    'viewer' => 'Read-only access to workspace data.'
  ];

  $insert = $pdo->prepare('INSERT INTO roles(slug, name, description) VALUES(?,?,?)');
  foreach ($roles as $slug => $description) {
    $check = $pdo->prepare('SELECT id FROM roles WHERE slug=?');
    $check->execute([$slug]);
    if ($check->fetchColumn()) continue;
    $insert->execute([$slug, ucfirst($slug), $description]);
  }
}

function ensure_default_tenant(PDO $pdo): void {
  $st = $pdo->prepare('SELECT id FROM tenants WHERE slug=?');
  $st->execute(['default']);
  $tenantId = (int)($st->fetchColumn() ?: 0);

  if (!$tenantId) {
    $pdo->prepare('INSERT INTO tenants(name, slug, plan, status) VALUES(?,?,?,?)')
      ->execute(['Demo Tenant', 'default', 'free', 'active']);
    $tenantId = (int)$pdo->lastInsertId();
  }

  $subs = $pdo->prepare('SELECT id FROM tenant_subscriptions WHERE tenant_id=?');
  $subs->execute([$tenantId]);
  if (!$subs->fetchColumn()) {
    $pdo->prepare('INSERT INTO tenant_subscriptions(tenant_id, plan, status, seats) VALUES(?,?,?,?)')
      ->execute([$tenantId, 'free', 'active', 5]);
  }

  $userSt = $pdo->prepare('SELECT id FROM users WHERE tenant_id=? ORDER BY id LIMIT 1');
  $userSt->execute([$tenantId]);
  $userId = (int)($userSt->fetchColumn() ?: 0);
  if (!$userId) {
    $password = password_hash('demo-pass1', PASSWORD_DEFAULT);
    $pdo->prepare('INSERT INTO users(tenant_id, email, display_name, password_hash) VALUES(?,?,?,?)')
      ->execute([$tenantId, 'admin@demo.test', 'Demo Admin', $password]);
    $userId = (int)$pdo->lastInsertId();
  }

  ensure_default_roles($pdo);

  $adminRoleId = (int)$pdo->query("SELECT id FROM roles WHERE slug='admin'" )->fetchColumn();
  if ($adminRoleId) {
    $link = $pdo->prepare('SELECT id FROM user_roles WHERE user_id=? AND role_id=?');
    $link->execute([$userId, $adminRoleId]);
    if (!$link->fetchColumn()) {
      $pdo->prepare('INSERT INTO user_roles(user_id, role_id) VALUES(?,?)')->execute([$userId, $adminRoleId]);
    }
  }
}

function current_tenant_id(): int {
  return (int)($_SESSION['tenant_id'] ?? 1);
}

function set_user_session(int $userId, int $tenantId, array $roles): void {
  $_SESSION['user_id'] = $userId;
  $_SESSION['tenant_id'] = $tenantId;
  $_SESSION['roles'] = $roles;
}

function clear_user_session(): void {
  unset($_SESSION['user_id'], $_SESSION['tenant_id'], $_SESSION['roles']);
}

function fetch_user(PDO $pdo, int $userId): ?array {
  $st = $pdo->prepare('SELECT id, tenant_id, email, display_name, status FROM users WHERE id=?');
  $st->execute([$userId]);
  $user = $st->fetch();
  if (!$user) return null;

  $rolesSt = $pdo->prepare('SELECT r.slug FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=? ORDER BY r.slug');
  $rolesSt->execute([$userId]);
  $roles = array_map(fn($r) => $r['slug'], $rolesSt->fetchAll());
  $user['roles'] = $roles;
  return $user;
}

function current_user(PDO $pdo): ?array {
  $userId = (int)($_SESSION['user_id'] ?? 0);
  if ($userId <= 0) return null;
  $user = fetch_user($pdo, $userId);
  if (!$user) return null;
  $_SESSION['tenant_id'] = (int)$user['tenant_id'];
  $_SESSION['roles'] = $user['roles'];
  return $user;
}

function require_user(PDO $pdo, array $roles = []): array {
  $user = current_user($pdo);
  if (!$user) {
    http_response_code(401);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
  }

  if ($roles) {
    $hasRole = array_intersect($roles, $user['roles']);
    if (!$hasRole) {
      http_response_code(403);
      header('Content-Type: application/json; charset=UTF-8');
      echo json_encode(['ok' => false, 'error' => 'Forbidden']);
      exit;
    }
  }

  return $user;
}

function list_belongs_to_tenant(PDO $pdo, int $listId, int $tenantId): bool {
  $st = $pdo->prepare('SELECT 1 FROM lists WHERE id=? AND tenant_id=?');
  $st->execute([$listId, $tenantId]);
  return (bool)$st->fetchColumn();
}

function list_tenant_id(PDO $pdo, int $listId): int {
  $st = $pdo->prepare('SELECT tenant_id FROM lists WHERE id=?');
  $st->execute([$listId]);
  return (int)($st->fetchColumn() ?: 1);
}

function tenant_subscription(PDO $pdo, int $tenantId): ?array {
  $st = $pdo->prepare('SELECT plan, status, seats, ends_at, meta FROM tenant_subscriptions WHERE tenant_id=?');
  $st->execute([$tenantId]);
  $sub = $st->fetch();
  if (!$sub) return null;
  return $sub;
}

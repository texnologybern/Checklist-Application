<?php
require_once __DIR__ . '/app/bootstrap.php';
ensure_migrated();
$list_id = (int)($_GET['list_id'] ?? 1);
require_auth($list_id);
$pdo = DB::conn();
$st = $pdo->prepare('SELECT id,title,description,checked FROM tasks WHERE list_id=? ORDER BY position,id');
$st->execute([$list_id]);
$tasks = $st->fetchAll();
?>
<!doctype html>
<html lang="el">
<head>
  <meta charset="utf-8" />
  <title>Εκτύπωση Λίστας</title>
  <link rel="stylesheet" href="assets/css/styles.css" />
  <style>
    body{margin:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;}
    ul.tasks{list-style:none;padding:0;margin:0;}
    .task{display:flex;align-items:flex-start;gap:10px;margin-bottom:6px;}
    .task.done label{text-decoration:line-through;color:#94a3b8;}
  </style>
</head>
<body onload="window.print()">
  <ul class="tasks">
    <?php foreach ($tasks as $t): ?>
      <li class="task<?= $t['checked'] ? ' done' : '' ?>">
        <input type="checkbox" <?= $t['checked'] ? 'checked' : '' ?> />
        <div class="content">
          <label><?= htmlspecialchars($t['title'], ENT_QUOTES) ?></label>
          <?php if (!empty($t['description'])): ?>
            <div class="desc"><?= htmlspecialchars($t['description'], ENT_QUOTES) ?></div>
          <?php endif; ?>
        </div>
      </li>
    <?php endforeach; ?>
  </ul>
</body>
</html>

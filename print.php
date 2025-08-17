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
    <style>
      body{margin:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#111;background:#fff;}
      ul.tasks{list-style:none;padding:0;margin:0;}
      .task{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #e5e7eb;}
      .task:last-child{border-bottom:none;}
      .task.done label{text-decoration:line-through;color:#6b7280;}
      .task .desc{font-size:13px;color:#444;margin-top:2px;}
      input[type="checkbox"]{margin-top:2px;}
    </style>
    <script>
      window.addEventListener('load', () => {
        window.print();
        window.addEventListener('afterprint', () => {
          if (window.opener) {
            window.close();
          } else {
            history.back();
          }
        }, { once: true });
      });
    </script>
  </head>
  <body>
  <ul class="tasks">
    <?php foreach ($tasks as $t): ?>
        <li class="task<?= $t['checked'] ? ' done' : '' ?>">
          <input type="checkbox" disabled <?= $t['checked'] ? 'checked' : '' ?> />
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

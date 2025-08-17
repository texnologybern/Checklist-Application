<?php
require_once __DIR__ . '/app/bootstrap.php';
ensure_migrated();
require_csrf(); // επιτρέπει GET χωρίς token, απαιτεί token για POST/PUT/DELETE
header('Content-Type: application/json; charset=UTF-8');

$action  = $_GET['action'] ?? '';
$list_id = (int)($_GET['list_id'] ?? ($_POST['list_id'] ?? 1));
require_auth($list_id);

/* ---------- helpers ---------- */
function j($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function require_method(string $method): void {
  if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== strtoupper($method)) {
    j(['ok'=>false,'error'=>'Method Not Allowed'], 405);
  }
}
function col_exists(PDO $pdo, string $table, string $col): bool {
  $st = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
  $st->execute([$col]);
  return (bool)$st->fetch();
}
function table_exists(PDO $pdo, string $table): bool {
  try { $pdo->query("SELECT 1 FROM `$table` LIMIT 1"); return true; }
  catch (Throwable $e) { return false; }
}
function progress(PDO $pdo, int $list_id): array {
  $s = $pdo->prepare('SELECT SUM(checked) AS done, COUNT(*) AS total FROM tasks WHERE list_id=?');
  $s->execute([$list_id]); $r = $s->fetch();
  $done = (int)($r['done'] ?? 0);
  $total = (int)($r['total'] ?? 0);
  $pct = $total > 0 ? (int)round($done / $total * 100) : 0;
  return ['done'=>$done,'total'=>$total,'percent'=>$pct];
}

try {
  $pdo = DB::conn();

  // runtime feature detection (ώστε να λειτουργεί ακόμη κι αν λείπουν migrations)
  $hasPriority = col_exists($pdo, 'tasks', 'priority');
  $hasTags     = col_exists($pdo, 'tasks', 'tags');
  $hasDeadline = col_exists($pdo, 'tasks', 'deadline');
  $hasCategory = col_exists($pdo, 'tasks', 'category_id');
  $hasNotesTbl = table_exists($pdo, 'task_notes');
  $hasCategoriesTbl = table_exists($pdo, 'categories');

  switch ($action) {

    case 'bootstrap': { // GET
      require_method('GET');

      // SELECT με fallbacks
      $sel = 'SELECT id,title,description,note,checked,position';
      $sel .= $hasDeadline ? ',deadline' : ',NULL AS deadline';
      $sel .= $hasCategory ? ',category_id' : ',NULL AS category_id';
      $sel .= $hasPriority ? ',priority' : ',2 AS priority';
      $sel .= $hasTags     ? ',tags'     : ",'' AS tags";
      $sel .= ' FROM tasks WHERE list_id=? ORDER BY position,id';

      $q = $pdo->prepare($sel);
      $q->execute([$list_id]);
      $tasks = $q->fetchAll();
      foreach ($tasks as &$t) {
        $t['checked'] = (int)$t['checked'];
        $t['priority'] = (int)$t['priority'];
        if (isset($t['category_id'])) $t['category_id'] = $t['category_id'] !== null ? (int)$t['category_id'] : null;
      }

      $cats = [];
      if ($hasCategoriesTbl) {
        $qc = $pdo->prepare('SELECT id,name,color,position FROM categories WHERE list_id=? ORDER BY position,id');
        $qc->execute([$list_id]);
        $cats = $qc->fetchAll();
      }

      $q2 = $pdo->prepare('SELECT id,name,location,date_label,owner,phone,notes,materials FROM lists WHERE id=?');
      $q2->execute([$list_id]); $meta = $q2->fetch() ?: [];

      j([
        'ok'=>true,
        'tasks'=>$tasks,
        'categories'=>$cats,
        'meta'=>$meta,
        'progress'=>progress($pdo,$list_id),
        'csrf'=>csrf_token()
      ]);
    }

    case 'toggle': { // POST
      require_method('POST');
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $id = (int)($b['id'] ?? 0);
      $checked = !empty($b['checked']) ? 1 : 0;
      $pdo->prepare('UPDATE tasks SET checked=? WHERE id=? AND list_id=?')->execute([$checked,$id,$list_id]);
      j(['ok'=>true]);
    }

    case 'note': { // POST (προαιρετικό απλό note στο tasks.note)
      require_method('POST');
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $id = (int)($b['id'] ?? 0);
      $note = trim((string)($b['note'] ?? ''));
      $pdo->prepare('UPDATE tasks SET note=? WHERE id=? AND list_id=?')->execute([$note,$id,$list_id]);
      j(['ok'=>true]);
    }

    case 'add': { // POST
      require_method('POST');
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $title = trim((string)($b['title'] ?? ''));
      if ($title==='') j(['ok'=>false,'error'=>'Title required'],400);
      $desc  = trim((string)($b['description'] ?? ''));
      $prio  = (int)($b['priority'] ?? 2); if ($prio<1 || $prio>3) $prio = 2;
      $tags  = trim((string)($b['tags'] ?? ''));
      $deadline = $hasDeadline ? ($b['deadline'] ?? null) : null;
      $cat_id   = $hasCategory ? (int)($b['category_id'] ?? 0) : 0;

      $posS = $pdo->prepare('SELECT COALESCE(MAX(position),0)+1 FROM tasks WHERE list_id=?');
      $posS->execute([$list_id]); $pos = (int)$posS->fetchColumn();

      $cols = ['list_id','title','description','position'];
      $vals = [$list_id,$title,$desc,$pos];
      if ($hasDeadline) { $cols[]='deadline'; $vals[]=$deadline; }
      if ($hasCategory) { $cols[]='category_id'; $vals[]=$cat_id>0?$cat_id:null; }
      if ($hasPriority) { $cols[]='priority'; $vals[]=$prio; }
      if ($hasTags)     { $cols[]='tags';     $vals[]=$tags; }

      $placeholders = implode(',', array_fill(0, count($vals), '?'));
      $st = $pdo->prepare('INSERT INTO tasks('.implode(',',$cols).') VALUES ('.$placeholders.')');
      $st->execute($vals);

      $id = (int)$pdo->lastInsertId();
      $sel = 'SELECT id,title,description,note,checked,position';
      $sel .= $hasDeadline ? ',deadline' : ',NULL AS deadline';
      $sel .= $hasCategory ? ',category_id' : ',NULL AS category_id';
      $sel .= $hasPriority ? ',priority' : ',2 AS priority';
      $sel .= $hasTags     ? ',tags'     : ",'' AS tags";
      $sel .= ' FROM tasks WHERE id=?';

      $tq = $pdo->prepare($sel);
      $tq->execute([$id]);
      $task = $tq->fetch();
      $task['checked']  = (int)$task['checked'];
      $task['priority'] = (int)$task['priority'];
      if (isset($task['category_id'])) $task['category_id'] = $task['category_id'] !== null ? (int)$task['category_id'] : null;

      j(['ok'=>true,'task'=>$task]);
    }

    case 'update_task': { // POST
      require_method('POST');
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $id   = (int)($b['id'] ?? 0);
      $title= trim((string)($b['title'] ?? ''));
      $desc = trim((string)($b['description'] ?? ''));
      $prio = (int)($b['priority'] ?? 2); if ($prio<1 || $prio>3) $prio = 2;
      $tags = trim((string)($b['tags'] ?? ''));
      $deadline = $hasDeadline ? ($b['deadline'] ?? null) : null;
      $cat_id   = $hasCategory ? (int)($b['category_id'] ?? 0) : 0;

      if ($id<=0 || $title==='') j(['ok'=>false,'error'=>'Invalid data'],400);

      $updates = ['title=?','description=?'];
      $params = [$title,$desc];
      if ($hasDeadline) { $updates[]='deadline=?'; $params[]=$deadline; }
      if ($hasCategory) { $updates[]='category_id=?'; $params[]=$cat_id>0?$cat_id:null; }
      if ($hasPriority) { $updates[]='priority=?'; $params[]=$prio; }
      if ($hasTags)     { $updates[]='tags=?';     $params[]=$tags; }
      $params[] = $id; $params[] = $list_id;
      $st = $pdo->prepare('UPDATE tasks SET '.implode(',', $updates).' WHERE id=? AND list_id=?');
      $st->execute($params);
      j(['ok'=>true]);
    }

    case 'delete': { // POST
      require_method('POST');
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $id = (int)($b['id'] ?? 0);
      $pdo->prepare('DELETE FROM tasks WHERE id=? AND list_id=?')->execute([$id,$list_id]);
      j(['ok'=>true]);
    }

    case 'category_add': { // POST
      require_method('POST');
      if (!$hasCategoriesTbl) j(['ok'=>false,'error'=>'Categories not enabled'],400);
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $name = trim((string)($b['name'] ?? ''));
      if ($name==='') j(['ok'=>false,'error'=>'Name required'],400);
      $color = trim((string)($b['color'] ?? ''));
      $posS = $pdo->prepare('SELECT COALESCE(MAX(position),0)+1 FROM categories WHERE list_id=?');
      $posS->execute([$list_id]); $pos = (int)$posS->fetchColumn();
      $st = $pdo->prepare('INSERT INTO categories(list_id,name,color,position) VALUES (?,?,?,?)');
      $st->execute([$list_id,$name,$color,$pos]);
      $id = (int)$pdo->lastInsertId();
      j(['ok'=>true,'category'=>['id'=>$id,'name'=>$name,'color'=>$color,'position'=>$pos]]);
    }

    case 'category_update': { // POST
      require_method('POST');
      if (!$hasCategoriesTbl) j(['ok'=>false,'error'=>'Categories not enabled'],400);
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $id   = (int)($b['id'] ?? 0);
      $name = trim((string)($b['name'] ?? ''));
      $color= trim((string)($b['color'] ?? ''));
      if ($id<=0 || $name==='') j(['ok'=>false,'error'=>'Invalid data'],400);
      $st = $pdo->prepare('UPDATE categories SET name=?, color=? WHERE id=? AND list_id=?');
      $st->execute([$name,$color,$id,$list_id]);
      j(['ok'=>true]);
    }

    case 'category_delete': { // POST
      require_method('POST');
      if (!$hasCategoriesTbl) j(['ok'=>true]);
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $id = (int)($b['id'] ?? 0);
      if ($id<=0) j(['ok'=>false,'error'=>'Invalid id'],400);
      $pdo->prepare('DELETE FROM categories WHERE id=? AND list_id=?')->execute([$id,$list_id]);
      if ($hasCategory) {
        $pdo->prepare('UPDATE tasks SET category_id=NULL WHERE category_id=? AND list_id=?')->execute([$id,$list_id]);
      }
      j(['ok'=>true]);
    }

    case 'update_meta': { // POST
      require_method('POST');
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $pdo->prepare('UPDATE lists SET date_label=?, owner=?, phone=?, notes=?, materials=? WHERE id=?')
          ->execute([(string)($b['date_label'] ?? ''),(string)($b['owner'] ?? ''),(string)($b['phone'] ?? ''),(string)($b['notes'] ?? ''),(string)($b['materials'] ?? ''),$list_id]);
      j(['ok'=>true]);
    }

    case 'reorder': { // POST
      require_method('POST');
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $ids = isset($b['ids']) && is_array($b['ids']) ? array_map('intval',$b['ids']) : [];
      if (!$ids) j(['ok'=>false,'error'=>'No ids'],400);

      $pdo->beginTransaction();
      $pos = 1; $st = $pdo->prepare('UPDATE tasks SET position=? WHERE id=? AND list_id=?');
      foreach ($ids as $id) $st->execute([$pos++, $id, $list_id]);
      $pdo->commit();
      j(['ok'=>true]);
    }

    case 'reset': { // POST – μηδενίζει όλα τα checked και κρατά την #4 αν υπάρχει
      require_method('POST');
      $pdo->beginTransaction();
      $pdo->prepare('UPDATE tasks SET checked=0 WHERE list_id=?')->execute([$list_id]);
      $pdo->prepare('UPDATE tasks SET checked=1 WHERE list_id=? AND position=4')->execute([$list_id]);
      $pdo->commit();
      j(['ok'=>true]);
    }

    /* ------- Notes (safe fallbacks) ------- */
    case 'comments': { // GET
      require_method('GET');
      if (!$hasNotesTbl) j(['ok'=>true,'notes'=>[]]); // fallback όταν δεν έχει γίνει migration
      $task_id = (int)($_GET['task_id'] ?? 0);
      if ($task_id<=0) j(['ok'=>false,'error'=>'task_id required'],400);

      // να ανήκει στη λίστα
      $chk = $pdo->prepare('SELECT 1 FROM tasks WHERE id=? AND list_id=?');
      $chk->execute([$task_id,$list_id]);
      if (!$chk->fetch()) j(['ok'=>false,'error'=>'Not found'],404);

      $q = $pdo->prepare("SELECT id, body, author, DATE_FORMAT(created_at,'%d/%m/%Y %H:%i') AS created_at_fmt FROM task_notes WHERE task_id=? ORDER BY id DESC");
      $q->execute([$task_id]);
      j(['ok'=>true,'notes'=>$q->fetchAll()]);
    }

    case 'comment_add': { // POST
      require_method('POST');
      if (!$hasNotesTbl) j(['ok'=>false,'error'=>'Notes not enabled'],400);
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $task_id = (int)($b['task_id'] ?? 0);
      $body    = trim((string)($b['body'] ?? ''));
      if ($task_id<=0 || $body==='') j(['ok'=>false,'error'=>'Invalid data'],400);

      $chk = $pdo->prepare('SELECT 1 FROM tasks WHERE id=? AND list_id=?');
      $chk->execute([$task_id,$list_id]);
      if (!$chk->fetch()) j(['ok'=>false,'error'=>'Not found'],404);

      $st = $pdo->prepare('INSERT INTO task_notes(task_id, body, author) VALUES (?,?,?)');
      $st->execute([$task_id,$body,null]);

      $id = (int)$pdo->lastInsertId();
      $q  = $pdo->prepare("SELECT id, body, author, DATE_FORMAT(created_at,'%d/%m/%Y %H:%i') AS created_at_fmt FROM task_notes WHERE id=?");
      $q->execute([$id]); $note = $q->fetch();
      j(['ok'=>true,'note'=>$note]);
    }

    case 'comment_delete': { // POST
      require_method('POST');
      if (!$hasNotesTbl) j(['ok'=>true]);
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $id = (int)($b['id'] ?? 0);
      if ($id<=0) j(['ok'=>false,'error'=>'Invalid id'],400);

      $st = $pdo->prepare("DELETE task_notes FROM task_notes JOIN tasks ON tasks.id=task_notes.task_id WHERE task_notes.id=? AND tasks.list_id=?");
      $st->execute([$id,$list_id]);
      j(['ok'=>true]);
    }

    default:
      j(['ok'=>false,'error'=>'Unknown action'],404);
  }
} catch (Throwable $e) {
  j(['ok'=>false,'error'=>'Server error','detail'=>$e->getMessage()],500);
}

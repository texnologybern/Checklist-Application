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
function norm_dt(?string $s): ?string {
  if ($s === null || $s === '') return null;
  $d = date_create($s);
  return $d ? $d->format('Y-m-d H:i:s') : null;
}
function fmt_dt(?string $s): ?string {
  if ($s === null || $s === '') return null;
  $d = date_create($s);
  return $d ? $d->format('Y-m-d\TH:i') : null;
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
  $hasNotesTbl = table_exists($pdo, 'task_notes');
  $hasStart    = col_exists($pdo, 'tasks', 'start_date');
  $hasDue      = col_exists($pdo, 'tasks', 'due_date');

  switch ($action) {

    case 'bootstrap': { // GET
      require_method('GET');

      // SELECT με fallbacks
      $sel = 'SELECT id,title,description,note,checked,position';
      $sel .= $hasPriority ? ',priority' : ',2 AS priority';
      $sel .= $hasTags     ? ',tags'     : ",'' AS tags";
      $sel .= $hasStart    ? ',start_date' : ',NULL AS start_date';
      $sel .= $hasDue      ? ',due_date'   : ',NULL AS due_date';
      $sel .= ' FROM tasks WHERE list_id=? ORDER BY position,id';

      $q = $pdo->prepare($sel);
      $q->execute([$list_id]);
      $tasks = $q->fetchAll();
      foreach ($tasks as &$t) {
        $t['checked'] = (int)$t['checked'];
        $t['priority'] = (int)$t['priority'];
        if (isset($t['start_date'])) $t['start_date'] = fmt_dt($t['start_date']);
        if (isset($t['due_date']))   $t['due_date']   = fmt_dt($t['due_date']);
      }

      $q2 = $pdo->prepare('SELECT id,name,location,date_label,owner,phone,notes,materials FROM lists WHERE id=?');
      $q2->execute([$list_id]); $meta = $q2->fetch() ?: [];

      j([
        'ok'=>true,
        'tasks'=>$tasks,
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
      $start = norm_dt(trim((string)($b['start_date'] ?? '')) ?: null);
      $due   = norm_dt(trim((string)($b['due_date']   ?? '')) ?: null);

      $posS = $pdo->prepare('SELECT COALESCE(MAX(position),0)+1 FROM tasks WHERE list_id=?');
      $posS->execute([$list_id]); $pos = (int)$posS->fetchColumn();

      $fields = ['list_id','title','description','position'];
      $place  = ['?','?','?','?'];
      $vals   = [$list_id,$title,$desc,$pos];
      if ($hasPriority) { $fields[]='priority'; $place[]='?'; $vals[]=$prio; }
      if ($hasTags)     { $fields[]='tags';     $place[]='?'; $vals[]=$tags; }
      if ($hasStart)    { $fields[]='start_date';$place[]='?'; $vals[]=$start; }
      if ($hasDue)      { $fields[]='due_date';  $place[]='?'; $vals[]=$due; }
      $st = $pdo->prepare('INSERT INTO tasks('.implode(',', $fields).') VALUES ('.implode(',', $place).')');
      $st->execute($vals);

      $id = (int)$pdo->lastInsertId();
      $sel = 'SELECT id,title,description,note,checked,position';
      $sel .= $hasPriority ? ',priority' : ',2 AS priority';
      $sel .= $hasTags     ? ',tags'     : ",'' AS tags";
      $sel .= $hasStart    ? ',start_date' : ',NULL AS start_date';
      $sel .= $hasDue      ? ',due_date'   : ',NULL AS due_date';
      $sel .= ' FROM tasks WHERE id=?';

      $tq = $pdo->prepare($sel);
      $tq->execute([$id]);
      $task = $tq->fetch();
      $task['checked']  = (int)$task['checked'];
      $task['priority'] = (int)$task['priority'];
      if (isset($task['start_date'])) $task['start_date'] = fmt_dt($task['start_date']);
      if (isset($task['due_date']))   $task['due_date']   = fmt_dt($task['due_date']);

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
      $start = norm_dt(trim((string)($b['start_date'] ?? '')) ?: null);
      $due   = norm_dt(trim((string)($b['due_date']   ?? '')) ?: null);

      if ($id<=0 || $title==='') j(['ok'=>false,'error'=>'Invalid data'],400);

      $fields = ['title=?','description=?'];
      $vals   = [$title,$desc];
      if ($hasPriority) { $fields[]='priority=?'; $vals[]=$prio; }
      if ($hasTags)     { $fields[]='tags=?';     $vals[]=$tags; }
      if ($hasStart)    { $fields[]='start_date=?'; $vals[]=$start; }
      if ($hasDue)      { $fields[]='due_date=?';   $vals[]=$due; }
      $vals[] = $id; $vals[] = $list_id;
      $st = $pdo->prepare('UPDATE tasks SET '.implode(',', $fields).' WHERE id=? AND list_id=?');
      $st->execute($vals);
      j(['ok'=>true]);
    }

    case 'delete': { // POST
      require_method('POST');
      $b = json_decode(file_get_contents('php://input'), true) ?: [];
      $id = (int)($b['id'] ?? 0);
      $pdo->prepare('DELETE FROM tasks WHERE id=? AND list_id=?')->execute([$id,$list_id]);
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
      $dates = isset($b['dates']) && is_array($b['dates']) ? $b['dates'] : [];

      $pdo->beginTransaction();
      $pos = 1; $st = $pdo->prepare('UPDATE tasks SET position=? WHERE id=? AND list_id=?');
      $stDate = ($hasStart || $hasDue) ? $pdo->prepare('UPDATE tasks SET start_date=?, due_date=? WHERE id=? AND list_id=?') : null;
      foreach ($ids as $id) {
        $st->execute([$pos++, $id, $list_id]);
        if ($stDate && isset($dates[$id])) {
          $sd = norm_dt($dates[$id]['start_date'] ?? null);
          $dd = norm_dt($dates[$id]['due_date']   ?? null);
          $stDate->execute([$sd, $dd, $id, $list_id]);
        }
      }
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

    case 'wipe': { // POST – διαγράφει όλες τις εργασίες και μεταδεδομένα
      require_method('POST');
      $pdo->beginTransaction();
      $pdo->prepare('DELETE FROM tasks WHERE list_id=?')->execute([$list_id]);
      $pdo->prepare('UPDATE lists SET date_label=NULL, owner=NULL, phone=NULL, notes=NULL, materials=NULL WHERE id=?')->execute([$list_id]);
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

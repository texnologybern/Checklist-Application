<?php
require_once __DIR__ . '/app/bootstrap.php';
ensure_migrated();

$list_id = (int)($_GET['list_id'] ?? 1);
require_auth($list_id);

$pdo = DB::conn();

// Φέρε εργασίες
$st = $pdo->prepare('SELECT title, description, checked FROM tasks WHERE list_id = ? ORDER BY position, id');
$st->execute([$list_id]);
$tasks = $st->fetchAll(PDO::FETCH_ASSOC);

// Προσπάθησε να βρεις τίτλο λίστας (fallback σε default)
$list_title = 'Λίστα Εργασιών';
try {
  $s2 = $pdo->prepare('SELECT * FROM lists WHERE id = ? LIMIT 1');
  $s2->execute([$list_id]);
  if ($row = $s2->fetch(PDO::FETCH_ASSOC)) {
    if (!empty($row['title'])) {
      $list_title = $row['title'];
    } elseif (!empty($row['name'])) {
      $list_title = $row['name'];
    }
  }
} catch (Throwable $e) {
  // ignore - κράτα το default
}

// Υπολογισμοί
$total   = count($tasks);
$doneArr = [];
$todoArr = [];
foreach ($tasks as $t) {
  if (!empty($t['checked'])) {
    $doneArr[] = $t;   // <-- διορθώθηκε: γράφουμε σε κανονικό array
  } else {
    $todoArr[] = $t;   // <-- διορθώθηκε
  }
}
$done    = count($doneArr);
$todo    = count($todoArr);
$percent = $total > 0 ? round(($done / $total) * 100) : 0;
$printed_at = (new DateTime('now'))->format('d/m/Y H:i');
?>
<!doctype html>
<html lang="el">
<head>
  <meta charset="utf-8" />
  <title>Εκτύπωση – <?= htmlspecialchars($list_title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root{
      --ink:#0f172a;
      --muted:#475569;
      --line:#e2e8f0;
      --ok:#065f46;
      --warn:#9a3412;
    }
    @page { size: A4; margin: 16mm; }
    *{ box-sizing: border-box; }
    html,body{ background:#fff; color:var(--ink); font: 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Noto Sans","Liberation Sans",sans-serif; }
    .wrap{ max-width: 1000px; margin: 0 auto; }
    header{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px; border-bottom:2px solid var(--ink); padding-bottom:10px; margin-bottom:18px; }
    header .meta{ font-size:12px; color:var(--muted); }
    h1{ margin:0; font-size:22px; line-height:1.2; }
    .summary{ display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:8px; margin:10px 0 18px; }
    .kpi{ border:1px solid var(--line); border-radius:10px; padding:10px 12px; }
    .kpi .label{ font-size:11px; color:var(--muted); }
    .kpi .value{ font-size:18px; font-weight:700; margin-top:2px; }

    .section{ margin-top:20px; }
    .section h2{ font-size:16px; margin:0 0 10px; padding-bottom:6px; border-bottom:1px solid var(--line); }
    table{ width:100%; border-collapse: collapse; }
    th, td{ padding:8px 10px; vertical-align: top; border-bottom:1px solid var(--line); }
    th{ text-align:left; font-size:12px; color:var(--muted); font-weight:600; }
    tbody tr:last-child td{ border-bottom:0; }
    .idx{ width:36px; text-align:right; color:var(--muted); }
    .title{ font-weight:600; }
    .desc{ color:#1f2937; font-size:12px; margin-top:2px; white-space:pre-wrap; }
    .status{ white-space:nowrap; font-size:12px; font-weight:600; }
    .status.ok{ color:var(--ok); }
    .status.todo{ color:var(--warn); }
    .badge{ display:inline-block; border:1px solid var(--line); border-radius:100px; padding:2px 8px; font-size:11px; }
    .check{ font-size:13px; margin-right:6px; }
    .avoid-break{ break-inside: avoid; page-break-inside: avoid; }

    footer{ margin-top:26px; padding-top:10px; border-top:1px dashed var(--line); display:flex; justify-content:space-between; font-size:11px; color:var(--muted); }
    .sign{ margin-top:22px; display:flex; gap:28px; }
    .sign .line{ width:260px; border-top:1px solid var(--line); height:18px; }
    .small{ font-size:11px; color:var(--muted); }

    @media print { a[href]:after{ content:""; } }
  </style>
</head>
<body onload="window.print()">
  <div class="wrap">
    <header>
      <div>
        <h1><?= htmlspecialchars($list_title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></h1>
        <div class="meta">Εκτυπώθηκε: <?= $printed_at ?> • Λίστα #<?= (int)$list_id ?></div>
      </div>
      <div class="summary">
        <div class="kpi"><div class="label">Σύνολο</div><div class="value"><?= (int)$total ?></div></div>
        <div class="kpi"><div class="label">Ολοκληρωμένες</div><div class="value"><?= (int)$done ?></div></div>
        <div class="kpi"><div class="label">Σε εξέλιξη</div><div class="value"><?= (int)$todo ?></div></div>
        <div class="kpi"><div class="label">% Ολοκλήρωσης</div><div class="value"><?= (int)$percent ?>%</div></div>
      </div>
    </header>

    <?php if ($todo > 0): ?>
      <section class="section avoid-break">
        <h2>Σε εξέλιξη</h2>
        <table aria-label="Εργασίες σε εξέλιξη">
          <thead>
            <tr>
              <th class="idx">#</th>
              <th>Εργασία</th>
              <th>Περιγραφή</th>
              <th>Κατάσταση</th>
            </tr>
          </thead>
          <tbody>
          <?php $i = 1; foreach ($todoArr as $t): ?>
            <tr class="avoid-break">
              <td class="idx"><?= $i++ ?></td>
              <td class="title"><?= htmlspecialchars($t['title'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
              <td>
                <?php if (!empty($t['description'])): ?>
                  <div class="desc"><?= htmlspecialchars($t['description'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></div>
                <?php endif; ?>
              </td>
              <td class="status todo"><span class="check">☐</span><span class="badge">Σε εξέλιξη</span></td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </section>
    <?php endif; ?>

    <?php if ($done > 0): ?>
      <section class="section avoid-break">
        <h2>Ολοκληρωμένες</h2>
        <table aria-label="Ολοκληρωμένες εργασίες">
          <thead>
            <tr>
              <th class="idx">#</th>
              <th>Εργασία</th>
              <th>Σχόλια</th>
              <th>Κατάσταση</th>
            </tr>
          </thead>
          <tbody>
          <?php $j = 1; foreach ($doneArr as $t): ?>
            <tr class="avoid-break">
              <td class="idx"><?= $j++ ?></td>
              <td class="title"><?= htmlspecialchars($t['title'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
              <td>
                <?php if (!empty($t['description'])): ?>
                  <div class="desc"><?= htmlspecialchars($t['description'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></div>
                <?php endif; ?>
              </td>
              <td class="status ok"><span class="check">✓</span><span class="badge">Ολοκληρώθηκε</span></td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </section>
    <?php endif; ?>

    <div class="sign">
      <div>
        <div class="small">Υπεύθυνος</div>
        <div class="line"></div>
      </div>
      <div>
        <div class="small">Έγκριση</div>
        <div class="line"></div>
      </div>
    </div>

    <footer>
      <div>Έγγραφο εκτύπωσης – <?= htmlspecialchars($list_title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></div>
      <div>Σελίδα <span class="pageNumber"></span></div>
    </footer>
  </div>
  <script>
    (function(){
      try {
        document.querySelectorAll('.pageNumber').forEach(function(el){ el.textContent = ''; });
      } catch(e){}
    })();
  </script>
</body>
</html>

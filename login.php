<?php
require_once __DIR__ . '/app/bootstrap.php';
ensure_migrated();

$list_id = (int)($_GET['list_id'] ?? $_POST['list_id'] ?? 1);

// Αν είσαι ήδη συνδεδεμένος, πάνε στη λίστα
if (is_authed($list_id)) {
  header('Location: index.php?list_id=' . $list_id);
  exit;
}

// Έλεγξε αν υπάρχει ήδη ορισμένος κωδικός
$pdo = DB::conn();
$st = $pdo->prepare('SELECT name, access_hash FROM lists WHERE id = ?');
$st->execute([$list_id]);
$row = $st->fetch();
$list_name = $row['name'] ?? 'Λίστα';
$has_password = !empty($row['access_hash']);

$error = '';
$mode = $has_password ? 'login' : 'setup'; // αν δεν υπάρχει hash, κάνε αρχική ρύθμιση

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $token = $_POST['csrf'] ?? '';
  if (!hash_equals(csrf_token(), $token)) {
    $error = 'Μη έγκυρο token.';
  } else {
    if ($mode === 'login') {
      $pass = (string)($_POST['password'] ?? '');
      if ($pass !== '' && verify_password($list_id, $pass)) {
        $_SESSION['auth_lists'][$list_id] = true;
        header('Location: index.php?list_id=' . $list_id);
        exit;
      } else {
        $error = 'Λάθος κωδικός.';
      }
    } else {
      // setup αρχικού κωδικού
      $p1 = (string)($_POST['password'] ?? '');
      $p2 = (string)($_POST['password2'] ?? '');
      if (strlen($p1) < 6) {
        $error = 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.';
      } elseif ($p1 !== $p2) {
        $error = 'Οι κωδικοί δεν ταιριάζουν.';
      } else {
        set_password($list_id, $p1);
        $_SESSION['auth_lists'][$list_id] = true;
        header('Location: index.php?list_id=' . $list_id);
        exit;
      }
    }
  }
}
?>
<!doctype html>
<html lang="el">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?= htmlspecialchars($mode === 'login' ? 'Σύνδεση' : 'Ορισμός κωδικού', ENT_QUOTES) ?> – <?= htmlspecialchars($list_name, ENT_QUOTES) ?></title>
  <link rel="stylesheet" href="assets/css/styles.css" />
  <link rel="stylesheet" href="assets/css/login.css" />
</head>
<body class="login">
  <div class="card">
    <header>
      <div>
        <div class="title"><?= htmlspecialchars($list_name, ENT_QUOTES) ?></div>
        <div class="subtitle">
          <?= $mode === 'login'
            ? 'Πληκτρολογήστε τον κωδικό πρόσβασης για να δείτε τη λίστα.'
            : 'Ορίστε έναν αρχικό κωδικό πρόσβασης για τη λίστα.' ?>
        </div>
      </div>
    </header>

    <?php if ($error): ?>
      <div class="error"><?= htmlspecialchars($error, ENT_QUOTES) ?></div>
    <?php endif; ?>

    <form method="post" class="meta">
      <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES) ?>">
      <input type="hidden" name="list_id" value="<?= (int)$list_id ?>">

      <div class="field">
        <label><?= $mode === 'login' ? 'Κωδικός πρόσβασης' : 'Νέος κωδικός πρόσβασης' ?></label>
        <input type="password" name="password" required autofocus autocomplete="<?= $mode === 'login' ? 'current-password' : 'new-password' ?>">
      </div>

      <?php if ($mode === 'setup'): ?>
        <div class="field">
          <label>Επιβεβαίωση κωδικού</label>
          <input type="password" name="password2" required autocomplete="new-password">
        </div>
      <?php endif; ?>

      <div class="toolbar">
        <button class="success" type="submit"><?= $mode === 'login' ? 'Σύνδεση' : 'Αποθήκευση κωδικού' ?></button>
      </div>
    </form>
  </div>
</body>
</html>

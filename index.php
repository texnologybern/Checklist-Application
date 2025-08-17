<?php require_once __DIR__ . '/app/bootstrap.php'; ensure_migrated(); $token = csrf_token(); $list_id = (int)($_GET['list_id'] ?? 1); require_auth($list_id); $token = csrf_token(); ?>

<!doctype html>
<html lang="el">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Λίστα Εργασιών – Πάρος</title>
  <meta name="csrf-token" content="<?= htmlspecialchars($token, ENT_QUOTES) ?>">
  <link rel="stylesheet" href="assets/css/styles.css" />
  <link rel="manifest" href="assets/manifest.webmanifest" />
<meta name="theme-color" content="#2563eb">
</head>
<body>
  <div class="page">
    <div class="card">
      <header>
        <div>
          <div class="title">Λίστα Εργασιών – Πάρος</div>
          <div class="subtitle">Συντήρηση & αναβαθμίσεις κατοικίας. Επιλέξτε τα κουτάκια για να σημειώσετε ό,τι ολοκληρώθηκε.</div>
        </div>
        <div class="toolbar">
          <button class="menuBtn" id="menuBtn">☰</button>
          <div class="toolbarButtons">
            <button class="primary" id="printBtn">🖨️ Εκτύπωση / PDF</button>
            <button id="resetBtn">↺ Επαναφορά επιλογών</button>
            <button class="success" id="saveBtn">💾 Αποθήκευση τώρα</button>
          </div>
        </div>
      </header>

      <div class="meta">
        <div class="field"><label>Ημερομηνία</label><input id="dateField" placeholder="π.χ. 14/08/2025"></div>
        <div class="field"><label>Υπεύθυνος</label><input id="ownerField" placeholder="π.χ. Γιώργος"></div>
        <div class="field"><label>Τηλ. Επικοινωνίας</label><input id="phoneField" placeholder=""></div>
        <div class="field"><label>Συνολική Πρόοδος</label><input id="progressField" readonly></div>
      </div>

      <div class="progressWrap">
        <div class="progressLabel"><span>Πρόοδος εργασιών</span><span id="percentText">0%</span></div>
        <div class="progress"><div class="bar" id="bar"></div></div>
      </div>
      
      <div class="sectionTitle">Φίλτρα</div>
  <div class="filters">
  <input id="filterSearch" placeholder="Αναζήτηση τίτλου/περιγραφής">
  <input id="filterTag" placeholder="Ετικέτα (π.χ. Ηλεκτρικά)">
  <select id="filterPriority">
    <option value="">Προτεραιότητα: Όλες</option>
    <option value="1">Υψηλή</option>
    <option value="2">Μεσαία</option>
    <option value="3">Χαμηλή</option>
  </select>
  <input type="date" id="filterFrom" title="Από">
  <input type="date" id="filterTo" title="Έως">
  <select id="sortDate">
    <option value="">Ταξινόμηση: Καμία</option>
    <option value="start_asc">Έναρξη ↑</option>
    <option value="start_desc">Έναρξη ↓</option>
    <option value="due_asc">Λήξη ↑</option>
    <option value="due_desc">Λήξη ↓</option>
  </select>
  <label class="onlyPending"><input type="checkbox" id="filterPending"> Μόνο εκκρεμή</label>
</div>


      <div class="sectionTitle">Προσθήκη νέας εργασίας</div>
      <div class="addForm">
        <input id="addTitle" placeholder="Τίτλος (π.χ. Βάψιμο υπνοδωματίου)">
        <textarea id="addDesc" placeholder="Σύντομη περιγραφή"></textarea>
        <select id="addPriority" title="Προτεραιότητα">
  <option value="2" selected>Μεσαία</option>
  <option value="1">Υψηλή</option>
  <option value="3">Χαμηλή</option>
</select>
<input id="addTags" placeholder="Ετικέτες (π.χ. Ηλεκτρικά,Μπάνιο)">
<div class="dateInputs">
  <input id="addStart" type="date" placeholder="Έναρξη" title="Ημερομηνία έναρξης">
  <input id="addDue" type="date" placeholder="Διορία" title="Διορία">
</div>
        <button class="success" id="addBtn">+ Προσθήκη</button>
        
      </div>

      <div class="sectionTitle">Εργασίες</div>
      <ul class="tasks" id="taskList"></ul>

      <div class="sectionTitle">Συνολικές Σημειώσεις</div>
      <div class="notesWrap">
        <textarea id="notes" placeholder="Γενικές παρατηρήσεις, ημερολόγιο εργασιών, εκκρεμότητες."></textarea>
        <textarea id="materials" placeholder="Υλικά προς αγορά / παραγγελίες."></textarea>
      </div>

      <footer>
        Συμβουλή: Κάντε κλικ στο «Εκτύπωση / PDF» για να αποθηκεύσετε την τρέχουσα κατάσταση ως PDF.
      </footer>
    </div>
  </div>
  <script src="assets/js/app.js"></script>
  <script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('assets/sw.js').catch(console.error);
}
</script>
</body>
</html>

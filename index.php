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
          <label class="themeSwitch" title="Αλλαγή θέματος">
            <input type="checkbox" id="themeToggle" />
            <span class="slider"></span>
          </label>
          <button class="menuBtn" id="menuBtn">☰</button>
          <div class="toolbarButtons">
            <button class="primary" id="printBtn">🖨️ Εκτύπωση / PDF</button>
            <button id="resetBtn">↺ Επαναφορά επιλογών</button>
            <button class="success" id="exportBtn">📄 Εξαγωγή JSON</button>
          </div>
        </div>
      </header>

      <main class="task-area">
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

        <div class="sectionTitle">Εργασίες</div>
        <ul class="tasks" id="taskList"></ul>

        <!-- ✅ Notes section from main -->
        <div class="sectionTitle notesHeader">
          <span>Συνολικές Σημειώσεις</span>
          <button id="notesToggle" aria-expanded="false">⮟</button>
        </div>
        <div class="notesWrap hidden" id="notesSection">
          <textarea id="notes" placeholder="Γενικές παρατηρήσεις, ημερολόγιο εργασιών, εκκρεμότητες."></textarea>
          <textarea id="materials" placeholder="Υλικά προς αγορά / παραγγελίες."></textarea>
        </div>

        <footer>
          Συμβουλή: Κάντε κλικ στο «Εκτύπωση / PDF» για να αποθηκεύσετε την τρέχουσα κατάσταση ως PDF.
        </footer>
      </main>

      <aside class="sidebar">
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
          <input type="date" id="filterFrom" title="Από" placeholder="Από">
          <input type="date" id="filterTo" title="Μέχρι" placeholder="Μέχρι">
          <select id="sortDate">
            <option value="">Ταξινόμηση: Καμία</option>
            <option value="start_asc">Από ↑</option>
            <option value="start_desc">Από ↓</option>
            <option value="due_asc">Μέχρι ↑</option>
            <option value="due_desc">Μέχρι ↓</option>
          </select>
          <label class="onlyPending"><input type="checkbox" id="filterPending"> Μόνο εκκρεμή</label>
        </div>

        <div class="sectionTitle" id="addSectionTitle">Προσθήκη νέας εργασίας</div>
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
            <input id="addStart" type="date" placeholder="Από" title="Ημερομηνία αρχής">
            <input id="addDue" type="date" placeholder="Μέχρι" title="Ημερομηνία λήξης">
          </div>
          <button class="success" id="addBtn">+ Προσθήκη</button>
        </div>
      </aside>
    </div>
  </div>

  <button class="fab" id="fabBtn">+</button>

  <div id="confirmModal" class="modal hidden">
    <div class="box">
      <p id="confirmText">Να διαγραφούν όλες οι εργασίες; Η ενέργεια δεν αναιρείται.</p>
      <div class="actions">
        <button id="confirmYes" class="danger">Διαγραφή</button>
        <button id="confirmNo">Άκυρο</button>
      </div>
    </div>
  </div>

  <div id="addModal" class="modal hidden">
    <div class="box">
      <div class="addForm">
        <input id="modalTitle" placeholder="Τίτλος (π.χ. Βάψιμο υπνοδωματίου)">
        <textarea id="modalDesc" placeholder="Σύντομη περιγραφή"></textarea>
        <select id="modalPriority" title="Προτεραιότητα">
          <option value="2" selected>Μεσαία</option>
          <option value="1">Υψηλή</option>
          <option value="3">Χαμηλή</option>
        </select>
        <input id="modalTags" placeholder="Ετικέτες (π.χ. Ηλεκτρικά,Μπάνιο)">
        <div class="dateInputs">
          <input id="modalStart" type="date" placeholder="Από" title="Ημερομηνία αρχής">
          <input id="modalDue" type="date" placeholder="Μέχρι" title="Ημερομηνία λήξης">
        </div>
      </div>
      <div class="actions">
        <button id="modalSave" class="success">Αποθήκευση</button>
        <button id="modalCancel">Άκυρο</button>
      </div>
    </div>
  </div>

  <script type="module" src="assets/js/main.js"></script>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('assets/sw.js').catch(console.error);
    }
  </script>
</body>
</html>

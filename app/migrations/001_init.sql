-- MySQL schema + seed
CREATE TABLE IF NOT EXISTS lists (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  location VARCHAR(191) NULL,
  date_label VARCHAR(50) NULL,
  owner VARCHAR(191) NULL,
  phone VARCHAR(50) NULL,
  notes TEXT NULL,
  materials TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  list_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  note TEXT NULL,
  checked TINYINT(1) NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_list FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default list
INSERT INTO lists (name, location, date_label, owner, phone, notes, materials)
VALUES ('Λίστα Εργασιών – Πάρος', 'Πάρος', DATE_FORMAT(NOW(), '%d/%m/%Y'), 'Γιώργος', '', '', '');
SET @list_id = LAST_INSERT_ID();

-- Seed tasks (mark #4 checked)
INSERT INTO tasks (list_id, title, description, checked, position) VALUES
(@list_id,'Φωταγωγός – σκέπαστρο & βάψιμο','Τοποθέτηση στεγάστρου και βάψιμο εξωτερικού χώρου.',0,1),
(@list_id,'Πόρτα εισόδου – αρμοί','Καθαρισμός/γέμισμα αρμών, στεγανοποίηση.',0,2),
(@list_id,'Μείκτης ντουζιέρας','Πρόταση: Artemis Cromo BM34F02C (Karag).',0,3),
(@list_id,'Λεκάνη – το πρόβλημα αποκαταστάθηκε','Έλεγχος για τυχόν διαρροές μετά από 48 ώρες.',1,4),
(@list_id,'Μπαλκονόπορτα – στοπ','Τοποθέτηση στοπ δαπέδου/τοίχου.',0,5),
(@list_id,'Παράθυρο – κλειδαριές','Αντικατάσταση/ρύθμιση μηχανισμών.',0,6),
(@list_id,'Καναπές – επισκευή','Έλεγχος σκελετού/ενίσχυση.',0,7),
(@list_id,'Κουρτινόξυλο παραθύρου & μπαλκονόπορτας','Τοποθέτηση με σωστά ούπα/βίδες.',0,8),
(@list_id,'Τοποθέτηση τηλεόρασης','Βάση VESA, τακτοποίηση καλωδίων.',0,9),
(@list_id,'Συναρμολόγηση/τοποθέτηση τραπεζιού','Συναρμολόγηση, ευθυγράμμιση.',0,10),
(@list_id,'Εξωτερικό τραπέζι με 2 καρέκλες','Ανθεκτικά σε ήλιο/αλάτι.',0,11),
(@list_id,'Αλέ-ρετούρ στο μεγάλο δωμάτιο','Εγκατάσταση διακόπτη αλέ-ρετούρ.',0,12),
(@list_id,'Δύο φώτα για σκάλα & μπροστινή αυλή','IP65+, 2700–3000K.',0,13),
(@list_id,'Κρεμαστό φως στην πόρτα','Σωστό ύψος, ζεστό φως.',0,14),
(@list_id,'Σύστημα Access Control','Πληκτρολόγιο/RFID/έξυπνη κλειδαριά.',0,15),
(@list_id,'Καθρέπτης ολόσωμος','Ασφαλής στήριξη.',0,16),
(@list_id,'Σημειώματα Wi‑Fi','Κάρτες με SSID/κωδικό/QR.',0,17),
(@list_id,'Διαχωριστικό βεράντας','Ελαφρύ και ανθεκτικό στο μελτέμι.',0,18);
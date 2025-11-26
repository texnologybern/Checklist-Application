# Checklist Application

Εφαρμογή web για διαχείριση λιστών εργασιών με υποστήριξη drag & drop,
σημειώσεις και λειτουργία χωρίς σύνδεση.

## Τεχνολογίες
- PHP 8 για το API και τη διαχείριση χρηστών
- Vanilla JS/ES Modules με bundler [Vite](https://vitejs.dev/)
- Service Worker & Web Manifest για PWA
- HTML/CSS

## Εγκατάσταση & Ανάπτυξη
1. **Απαραίτητα**: PHP 8, Node.js 18+, npm.
2. `npm install` για εγκατάσταση εξαρτήσεων.
3. `npm run dev` για περιβάλλον ανάπτυξης (Vite dev server).
4. `npm run build` για παραγωγή (δημιουργεί φάκελο `dist/`).
5. Τοποθετήστε τα PHP αρχεία σε server (Apache/Nginx) που να μπορεί να εκτελεί `api.php`.

## Χαρακτηριστικά
- Αναδιάταξη εργασιών με drag & drop και αποθήκευση σειράς.
- Σημειώσεις ανά εργασία και inline επεξεργασία.
- Προτεραιότητες, ετικέτες, ημερομηνίες έναρξης/λήξης και φίλτρα προβολής.
- Παρακολούθηση προόδου ολοκλήρωσης.
- PWA με manifest και service worker για offline χρήση.

## Ρύθμιση βάσης δεδομένων & χρηστών
- Οι πίνακες δημιουργούνται/τροποποιούνται αυτόματα στην πρώτη κλήση (μέσω `ensure_migrated()` στο `app/bootstrap.php`). Αυτό περιλαμβάνει πολυμισθωτική υποστήριξη (`tenants`, `users`, `user_roles`, `tenant_subscriptions`, `user_layouts`) και την προσθήκη `tenant_id` στους πίνακες `lists` και `tasks`.
- Ο προεπιλεγμένος tenant και χρήστης στήνονται αυτόματα:
  - Tenant: **Demo Tenant** με `slug` `default` και πλάνο `free`.
  - Διαχειριστής: email `admin@demo.test`, κωδικός `demo-pass1`, με ρόλο `admin`.
- Για επιπλέον tenants ή λογαριασμούς, χρησιμοποιήστε το CLI script `bin/create_user.php`:
  ```bash
  php bin/create_user.php --tenant=my-space --email=user@example.com --name="Maria" --password="strongPass9" --roles=admin,member
  ```
  - Αν ο tenant δεν υπάρχει, δημιουργείται αυτόματα με πλάνο `free` και ενεργό status.
  - Τα roles πρέπει να αντιστοιχούν σε υπάρχοντα slugs (`admin`, `member`, `viewer`). Το script εξασφαλίζει ότι οι ρόλοι υπάρχουν πριν γίνει η αντιστοίχιση.
- Οι χρήστες και τα layouts αποθηκεύονται ανά tenant, οπότε κάθε workspace έχει απομονωμένα δεδομένα και ρυθμίσεις διεπαφής.

## Περιβάλλον Παραγωγής
- Εκτελέστε `npm run build` και σερβίρετε τα περιεχόμενα του `dist/` μαζί με τα PHP αρχεία.
- Ρυθμίστε server με PHP 8 και ενεργό `mod_rewrite` (ή αντίστοιχη ρύθμιση σε Nginx).
- Ενεργοποιήστε HTTPS (π.χ. Let\'s Encrypt) ώστε να λειτουργεί ο service worker.
- Στον Apache χρησιμοποιήστε το `.htaccess` για απαγόρευση πρόσβασης σε ευαίσθητα αρχεία
  και απενεργοποίηση `display_errors` σε παραγωγή.
- Ορίστε κατάλληλα δικαιώματα γραφής στους καταλόγους που αποθηκεύουν δεδομένα.

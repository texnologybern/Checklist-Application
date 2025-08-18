-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 18, 2025 at 08:33 PM
-- Server version: 10.6.19-MariaDB
-- PHP Version: 8.4.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `texnologybern_checker_paros`
--

-- --------------------------------------------------------

--
-- Table structure for table `lists`
--

CREATE TABLE `lists` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(191) NOT NULL,
  `location` varchar(191) DEFAULT NULL,
  `date_label` varchar(50) DEFAULT NULL,
  `owner` varchar(191) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `materials` text DEFAULT NULL,
  `access_hash` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lists`
--

INSERT INTO `lists` (`id`, `name`, `location`, `date_label`, `owner`, `phone`, `notes`, `materials`, `access_hash`, `created_at`) VALUES
(1, 'Λίστα Εργασιών – Πάρος', 'Πάρος', '15/08/2025', 'Γιώργος', '', 'dgfgdf', 'test \n', '$2y$10$nrRKHprYg9nNFtFVnD/T6O1yetWaOc6lm1Xyga471H.JAXLhNV/Qe', '2025-08-14 22:53:43');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(10) UNSIGNED NOT NULL,
  `list_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `note` text DEFAULT NULL,
  `checked` tinyint(1) NOT NULL DEFAULT 0,
  `position` int(11) NOT NULL DEFAULT 0,
  `priority` tinyint(4) NOT NULL DEFAULT 2,
  `tags` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `list_id`, `title`, `description`, `note`, `checked`, `position`, `priority`, `tags`, `start_date`, `due_date`, `created_at`) VALUES
(2, 1, 'Πόρτα εισόδου – αρμοί', 'Καθαρισμός/γέμισμα αρμών, στεγανοποίηση.', NULL, 0, 6, 2, '', '2025-08-16', NULL, '2025-08-14 22:53:43'),
(3, 1, 'Μείκτης ντουζιέρας', 'Πρόταση: Artemis Cromo BM34F02C (Karag).', NULL, 0, 7, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(4, 1, 'Λεκάνη – το πρόβλημα αποκαταστάθηκε', 'Έλεγχος για τυχόν διαρροές μετά από 48 ώρες.', NULL, 0, 5, 2, '', NULL, NULL, '2025-08-14 22:53:43'),
(5, 1, 'Μπαλκονόπορτα – στοπ', 'Τοποθέτηση στοπ δαπέδου/τοίχου.', NULL, 0, 9, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(6, 1, 'Παράθυρο – κλειδαριές', 'Αντικατάσταση/ρύθμιση μηχανισμών.', NULL, 0, 8, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(7, 1, 'Καναπές – επισκευή', 'Έλεγχος σκελετού/ενίσχυση.', NULL, 0, 12, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(8, 1, 'Κουρτινόξυλο παραθύρου & μπαλκονόπορτας', 'Τοποθέτηση με σωστά ούπα/βίδες.', NULL, 0, 10, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(9, 1, 'Τοποθέτηση τηλεόρασης', 'Βάση VESA, τακτοποίηση καλωδίων.', NULL, 0, 15, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(10, 1, 'Συναρμολόγηση/τοποθέτηση τραπεζιού', 'Συναρμολόγηση, ευθυγράμμιση.', NULL, 0, 13, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(11, 1, 'Εξωτερικό τραπέζι με 2 καρέκλες', 'Ανθεκτικά σε ήλιο/αλάτι.', NULL, 0, 11, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(12, 1, 'Αλέ-ρετούρ στο μεγάλο δωμάτιο', 'Εγκατάσταση διακόπτη αλέ-ρετούρ.', NULL, 0, 16, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(13, 1, 'Δύο φώτα για σκάλα & μπροστινή αυλή', 'IP65+, 2700–3000K.', NULL, 0, 2, 2, '', NULL, NULL, '2025-08-14 22:53:43'),
(14, 1, 'Κρεμαστό φως στην πόρτα', 'Σωστό ύψος, ζεστό φως.', NULL, 0, 17, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(15, 1, 'Σύστημα Access Control', 'Πληκτρολόγιο/RFID/έξυπνη κλειδαριά.', NULL, 0, 14, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(16, 1, 'Καθρέπτης ολόσωμος', 'Ασφαλής στήριξη.', NULL, 0, 18, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(17, 1, 'Σημειώματα Wi‑Fi', 'Κάρτες με SSID/κωδικό/QR.', NULL, 0, 3, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(18, 1, 'Διαχωριστικό βεράντας', 'Ελαφρύ και ανθεκτικό στο μελτέμι.', NULL, 0, 4, 2, NULL, NULL, NULL, '2025-08-14 22:53:43'),
(35, 1, 'Κομμωτήριο', 'Κομμωτήριο με τον Γιώργο', NULL, 0, 19, 1, '', '2025-08-21', '2025-08-21', '2025-08-18 14:21:07'),
(36, 1, 'Να παραλάβω τον πάγο από τον προμηθευτή 23', 'Τον λένε έτσι και αλλιώς', NULL, 0, 1, 2, 'Τρόφιμα', '2025-08-20', '2025-08-20', '2025-08-18 16:55:31');

-- --------------------------------------------------------

--
-- Table structure for table `task_notes`
--

CREATE TABLE `task_notes` (
  `id` int(10) UNSIGNED NOT NULL,
  `task_id` int(10) UNSIGNED NOT NULL,
  `body` text NOT NULL,
  `author` varchar(191) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `task_notes`
--

INSERT INTO `task_notes` (`id`, `task_id`, `body`, `author`, `created_at`) VALUES
(90, 36, 'τεσδτ', NULL, '2025-08-18 17:28:06');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `lists`
--
ALTER TABLE `lists`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tasks_list` (`list_id`);

--
-- Indexes for table `task_notes`
--
ALTER TABLE `task_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_task_notes_task` (`task_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `lists`
--
ALTER TABLE `lists`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `task_notes`
--
ALTER TABLE `task_notes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=91;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `fk_tasks_list` FOREIGN KEY (`list_id`) REFERENCES `lists` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_notes`
--
ALTER TABLE `task_notes`
  ADD CONSTRAINT `fk_task_notes_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

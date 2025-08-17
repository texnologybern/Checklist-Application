-- Add categories table and deadline support

ALTER TABLE tasks
  ADD COLUMN deadline DATE NULL AFTER description,
  ADD COLUMN category_id INT UNSIGNED NULL AFTER list_id;

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  list_id INT UNSIGNED NOT NULL,
  name VARCHAR(191) NOT NULL,
  color VARCHAR(20) NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_list FOREIGN KEY (list_id)
    REFERENCES lists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_category FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE SET NULL;

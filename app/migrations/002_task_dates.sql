ALTER TABLE tasks
  ADD COLUMN start_date DATE NULL AFTER tags,
  ADD COLUMN due_date DATE NULL AFTER start_date;

-- ============================================================
-- SkillExchange — database schema + sample seed data
-- Import via phpMyAdmin, or: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS skillexchange_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE skillexchange_db;

DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS users;

-- ------------------------------------------------------------
-- Users (real accounts — hashed passwords, not the old
-- "remember me by browser id" trick)
-- ------------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  contact VARCHAR(150) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Skills — one table, a `type` column distinguishes
-- "I can teach this" from "I want to learn this"
-- ------------------------------------------------------------
CREATE TABLE skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('teach','learn') NOT NULL,
  skill_name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Trade requests, with a status workflow
-- ------------------------------------------------------------
CREATE TABLE requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  skill_id INT NOT NULL,
  skill_type ENUM('teach','learn') NOT NULL,
  skill_name VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Sample data. Password for every seeded account is: password123
-- (bcrypt hash below is real and will pass password_verify())
-- ------------------------------------------------------------
INSERT INTO users (name, email, password_hash, contact) VALUES
  ('Priya R.', 'priya@example.com', '$2y$10$y1cg/CYIMePziQXXtv/M5OylvexTFYQcrwp7fp8ES1alpMpRl78gG', 'priya@example.com'),
  ('Kenji M.', 'kenji@example.com', '$2y$10$y1cg/CYIMePziQXXtv/M5OylvexTFYQcrwp7fp8ES1alpMpRl78gG', 'kenji@example.com'),
  ('Maya S.',  'maya@example.com',  '$2y$10$y1cg/CYIMePziQXXtv/M5OylvexTFYQcrwp7fp8ES1alpMpRl78gG', 'maya@example.com');

INSERT INTO skills (user_id, type, skill_name, category, description) VALUES
  (1, 'teach', 'Excel & macros', 'Tech', 'Two sessions covering formulas, pivot tables, and basic VBA macros.'),
  (1, 'learn', 'Piano basics', 'Music', NULL),
  (2, 'teach', 'Logo design', 'Creative', 'Fundamentals of logo design in Figma, from sketch to vector.'),
  (2, 'learn', 'Excel formulas', 'Tech', NULL),
  (3, 'teach', 'Bread baking', 'Craft & Trade', 'Sourdough basics: starter care, folding technique, and oven timing.'),
  (3, 'learn', 'Logo design', 'Creative', NULL);

INSERT INTO requests (from_user_id, to_user_id, skill_id, skill_type, skill_name, message, status) VALUES
  (3, 2, 3, 'teach', 'Logo design', 'Hi Kenji, I would love to learn logo design basics — happy to trade bread baking sessions in return!', 'pending');

-- PUP PQ Scheduler Database Schema & Seed Data
-- Compatible with MySQL (can be run in phpMyAdmin or MySQL CLI)
-- For PostgreSQL, replace AUTO_INCREMENT with SERIAL.

-- 1. Create Database if not exists (MySQL only)
CREATE DATABASE IF NOT EXISTS `pup_workload`;
USE `pup_workload`;

-- 2. Drop existing tables if they exist
DROP TABLE IF EXISTS `request_history`;
DROP TABLE IF EXISTS `loads`;
DROP TABLE IF EXISTS `program_subjects`;
DROP TABLE IF EXISTS `program_sections`;
DROP TABLE IF EXISTS `programs`;
DROP TABLE IF EXISTS `school_years`;
DROP TABLE IF EXISTS `faculty`;
DROP TABLE IF EXISTS `rooms`;
DROP TABLE IF EXISTS `users`;

-- 3. Create Tables
CREATE TABLE `rooms` (
    `name` VARCHAR(100) NOT NULL PRIMARY KEY,
    `building` VARCHAR(100) NOT NULL
);

CREATE TABLE `users` (
    `username` VARCHAR(100) NOT NULL PRIMARY KEY,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(100) DEFAULT 'user',
    `display_name` VARCHAR(100) DEFAULT 'Academic Aide',
    `id_number` VARCHAR(100) DEFAULT 'TEMP-001'
);

CREATE TABLE `faculty` (
    `id` VARCHAR(100) NOT NULL PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `base_designation` VARCHAR(255) DEFAULT '',
    `program` VARCHAR(100) DEFAULT '',
    `employment_type` VARCHAR(100) DEFAULT '',
    `classification` VARCHAR(100) DEFAULT '',
    `classification_rank` VARCHAR(100) DEFAULT '',
    `active` BOOLEAN DEFAULT TRUE,
    `baccalaureate` VARCHAR(255) DEFAULT '',
    `masters` VARCHAR(255) DEFAULT '',
    `doctorate` VARCHAR(255) DEFAULT '',
    `post_baccalaureate` VARCHAR(255) DEFAULT '',
    `license_number` VARCHAR(100) DEFAULT '',
    `specialization` VARCHAR(255) DEFAULT '',
    `national_certificate` VARCHAR(100) DEFAULT '',
    `gen_ed` VARCHAR(255) DEFAULT '',
    `core_subject` VARCHAR(255) DEFAULT '',
    `professional_subject` VARCHAR(255) DEFAULT '',
    `technical_subject` VARCHAR(255) DEFAULT '',
    `research_production` VARCHAR(50) DEFAULT '0',
    `research_presentation` VARCHAR(50) DEFAULT '0',
    `research_publication` VARCHAR(50) DEFAULT '0',
    `research_citation` VARCHAR(50) DEFAULT '0',
    `extension` VARCHAR(255) DEFAULT '',
    `nature_of_appointment` VARCHAR(100) DEFAULT '',
    `preferred_subjects` VARCHAR(255) DEFAULT '',
    `preferred_times` VARCHAR(255) DEFAULT '',
    `remarks` VARCHAR(255) DEFAULT '',
    `email` VARCHAR(255) DEFAULT '',
    `rate_per_day` DECIMAL(12, 2) DEFAULT 0.00,
    `rate_per_month` DECIMAL(12, 2) DEFAULT 0.00,
    `rate_per_hour` DECIMAL(12, 2) DEFAULT 0.00
);

CREATE TABLE `school_years` (
    `name` VARCHAR(100) NOT NULL PRIMARY KEY
);

CREATE TABLE `programs` (
    `name` VARCHAR(100) NOT NULL PRIMARY KEY
);

CREATE TABLE `program_sections` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `program_name` VARCHAR(100) NOT NULL,
    `section_name` VARCHAR(100) NOT NULL,
    FOREIGN KEY (`program_name`) REFERENCES `programs` (`name`) ON DELETE CASCADE
);

CREATE TABLE `program_subjects` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `program_name` VARCHAR(100) NOT NULL,
    `year_level` VARCHAR(50) NOT NULL,
    `semester` VARCHAR(50) NULL,
    `subject_name` VARCHAR(255) NOT NULL,
    `lec_units` DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    `lab_units` DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    `units` DECIMAL(4,1) NOT NULL,
    `is_bridging` TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (`program_name`) REFERENCES `programs` (`name`) ON DELETE CASCADE
);

CREATE TABLE `loads` (
    `id` BIGINT NOT NULL PRIMARY KEY,
    `prof` VARCHAR(255) NOT NULL,
    `sub` VARCHAR(255) NOT NULL,
    `units` DECIMAL(4,1) NOT NULL,
    `component_type` ENUM('Lec', 'Lab', 'Lec/Lab') NOT NULL DEFAULT 'Lec',
    `load_type` VARCHAR(100) NOT NULL,
    `sec` VARCHAR(100) NOT NULL,
    `room` VARCHAR(100) NOT NULL,
    `building` VARCHAR(100) NOT NULL,
    `day` VARCHAR(50) NOT NULL,
    `time` VARCHAR(100) NOT NULL,
    `sy` VARCHAR(100) NOT NULL,
    `program` VARCHAR(100) NOT NULL,
    `semester` VARCHAR(50) DEFAULT '1',
    FOREIGN KEY (`sy`) REFERENCES `school_years` (`name`) ON DELETE CASCADE,
    FOREIGN KEY (`program`) REFERENCES `programs` (`name`) ON DELETE CASCADE
);

CREATE TABLE `request_history` (
    `id` VARCHAR(100) NOT NULL PRIMARY KEY,
    `type` VARCHAR(100) NOT NULL,
    `requested_by` VARCHAR(255) NOT NULL,
    `requested_by_username` VARCHAR(100) DEFAULT '',
    `remarks` TEXT DEFAULT '',
    `summary` VARCHAR(255) DEFAULT '',
    `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `payload` LONGTEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `emails` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `recipient_email` VARCHAR(255) NOT NULL,
    `recipient` VARCHAR(255) DEFAULT '',
    `recipient_name` VARCHAR(255) DEFAULT '',
    `subject` VARCHAR(255) NOT NULL,
    `body` LONGTEXT DEFAULT NULL,
    `status` VARCHAR(50) DEFAULT 'sent',
    `sent_by` VARCHAR(100) DEFAULT 'Academic Head',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Seed Data
-- Temporary demo records intentionally left blank so the system starts empty and loads data from the real database only.

-- Users
INSERT INTO `users` (`username`, `password_hash`, `role`, `display_name`) VALUES
('aide_pq', '$2b$10$PvAD47KXiSoKlyTAdVD0cOl1oZTzvqQU08YgosA.tgv6qAv4jdmeC', 'Academic Aide', 'Academic Aide'),
('head_pq', '$2b$10$PvAD47KXiSoKlyTAdVD0cOl1oZTzvqQU08YgosA.tgv6qAv4jdmeC', 'Academic Head', 'Academic Head');

-- PUP PQ Scheduler Database Schema & Seed Data
-- Compatible with MySQL (can be run in phpMyAdmin or MySQL CLI)
-- For PostgreSQL, replace AUTO_INCREMENT with SERIAL.

-- 1. Create Database if not exists (MySQL only)
CREATE DATABASE IF NOT EXISTS `pup_workload`;
USE `pup_workload`;

-- 2. Drop existing tables if they exist
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
    `display_name` VARCHAR(100) DEFAULT 'Academic Aide'
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
    `remarks` VARCHAR(255) DEFAULT ''
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
    `semester` VARCHAR(50) NOT NULL,
    `subject_name` VARCHAR(255) NOT NULL,
    `units` INT NOT NULL,
    FOREIGN KEY (`program_name`) REFERENCES `programs` (`name`) ON DELETE CASCADE
);

CREATE TABLE `loads` (
    `id` BIGINT NOT NULL PRIMARY KEY,
    `prof` VARCHAR(255) NOT NULL,
    `sub` VARCHAR(255) NOT NULL,
    `units` INT NOT NULL,
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

-- 4. Seed Data

-- Rooms
INSERT INTO `rooms` (`name`, `building`) VALUES
('Room A101', 'New Building'),
('Room A102', 'New Building'),
('Lab A', 'New Building'),
('Audio Visual Room', 'New Building'),
('Room B201', 'New Building'),
('Room B202', 'New Building'),
('Lab B', 'New Building');

-- Faculty Registry
INSERT INTO `faculty` (
    `id`, `name`, `base_designation`, `program`, `employment_type`, `classification`, `classification_rank`, `active`,
    `baccalaureate`, `masters`, `doctorate`, `post_baccalaureate`, `license_number`, `specialization`, `national_certificate`,
    `gen_ed`, `core_subject`, `professional_subject`, `technical_subject`,
    `research_production`, `research_presentation`, `research_publication`, `research_citation`,
    `extension`, `nature_of_appointment`, `remarks`
) VALUES
(
    'prof-jefferson', 'Sir Jefferson', 'Instructor I', 'Information Technology', 'Regular', 'Designee', 'instructor', TRUE,
    'BS Information Technology', 'MSc Computer Science', '', '', 'LIC-9134', 'Systems Analysis', 'NC II',
    'Math', 'IT102', 'Software Engineering', 'Programming',
    '2', '3', '1', '8',
    'Community IT Training', 'Full-time', 'In good standing'
),
(
    'prof-delacruz', 'Dr. Maria Dela Cruz', 'Head of Academic Affairs', 'Information Technology', 'Regular', 'Director', 'campus_director', TRUE,
    'BS Computer Science', 'MEd Curriculum', 'PhD Educational Leadership', '', 'LIC-7201', 'Database Systems', 'NC III',
    'English', 'DB Systems', 'Database Design', 'SQL Programming',
    '4', '2', '2', '15',
    'Research mentorship', 'Full-time', 'Academic leader'
),
(
    'prof-santos', 'Prof. Ricardo Santos', 'Regular Lecturer', 'Computer Engineering', 'Regular', 'Regular', '', TRUE,
    'BSE Computer Engineering', 'MEng Electronics', '', '', 'LIC-4485', 'Microprocessors', 'NC IV',
    'Physics', 'Microprocessor Systems', 'Embedded Systems', 'Circuit Design',
    '1', '1', '0', '2',
    'Technical workshops', 'Full-time', 'Consistent instructor'
);

-- School Years
INSERT INTO `school_years` (`name`) VALUES
('A.Y. 2024-2025'),
('A.Y. 2025-2026'),
('A.Y. 2026-2027');

-- Programs
INSERT INTO `programs` (`name`) VALUES
('Information Technology'),
('Computer Engineering'),
('Hospitality Management');

-- Program Sections
INSERT INTO `program_sections` (`program_name`, `section_name`) VALUES
('Information Technology', 'BSIT 1-1'),
('Information Technology', 'BSIT 2-1'),
('Information Technology', 'BSIT 3-1'),
('Computer Engineering', 'COE 3-1'),
('Computer Engineering', 'COE 4-1'),
('Hospitality Management', 'HM 1-1'),
('Hospitality Management', 'HM 2-1');

-- Program Subjects
INSERT INTO `program_subjects` (`program_name`, `year_level`, `semester`, `subject_name`, `units`) VALUES
('Information Technology', '1st Year', '1st Semester', 'IT101 - Introduction to Computing', 3),
('Information Technology', '1st Year', '1st Semester', 'PATHFIT 1 - Movement Competency Training', 2),
('Information Technology', '1st Year', '2nd Semester', 'IT102 - Computer Programming 1', 3),
('Information Technology', '1st Year', '2nd Semester', 'IT103 - Discrete Structures', 3),
('Information Technology', '2nd Year', '1st Semester', 'IT201 - Data Structures and Algorithms', 3),
('Information Technology', '2nd Year', '1st Semester', 'IT202 - Object-Oriented Programming', 3),
('Information Technology', '2nd Year', '2nd Semester', 'IT203 - Web Systems and Technologies', 3),
('Information Technology', '2nd Year', '2nd Semester', 'IT204 - Computer Architecture and Organization', 3),
('Information Technology', '2nd Year', 'Summer Term', 'IT-INT1 - Industry Practicum 1', 2),
('Information Technology', '3rd Year', '1st Semester', 'IT311 - Database Systems', 3),
('Information Technology', '3rd Year', '1st Semester', 'IT312 - Software Engineering 1', 3),
('Information Technology', '3rd Year', '2nd Semester', 'IT313 - Information Assurance and Security', 3),
('Computer Engineering', '3rd Year', '1st Semester', 'COE311 - Digital Design', 4),
('Computer Engineering', '3rd Year', '2nd Semester', 'COE221 - Electronics I', 3),
('Computer Engineering', '4th Year', '1st Semester', 'COE412 - Microprocessor Systems', 4),
('Hospitality Management', '1st Year', '1st Semester', 'HM101 - Food Service Management', 3),
('Hospitality Management', '1st Year', '1st Semester', 'PATHFIT 1 - Movement Competency Training', 2);

-- Loads / Workloads
INSERT INTO `loads` (`id`, `prof`, `sub`, `units`, `load_type`, `sec`, `room`, `building`, `day`, `time`, `sy`, `program`, `semester`) VALUES
(1, 'Dr. Maria Dela Cruz', 'IT311 - Database Systems', 3, 'Regular Load', 'BSIT 2-1', 'Room A101', 'Main Building', 'Monday', '08:00 AM - 11:00 AM', 'A.Y. 2024-2025', 'Information Technology', '1'),
(2, 'Prof. Ricardo Santos', 'COE412 - Microprocessor Systems', 4, 'Regular Load', 'COE 4-1', 'Room B202', 'New Building', 'Wednesday', '10:00 AM - 02:00 PM', 'A.Y. 2024-2025', 'Computer Engineering', '1');

-- Users
INSERT INTO `users` (`username`, `password_hash`, `role`, `display_name`) VALUES
('aide_pq', '$2b$10$PvAD47KXiSoKlyTAdVD0cOl1oZTzvqQU08YgosA.tgv6qAv4jdmeC', 'Academic Aide', 'Academic Aide'),
('head_pq', '$2b$10$PvAD47KXiSoKlyTAdVD0cOl1oZTzvqQU08YgosA.tgv6qAv4jdmeC', 'Academic Head', 'Academic Head');

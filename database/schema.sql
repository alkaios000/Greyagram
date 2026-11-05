-- ============================================================
-- Greyagram - Database Schema & Initial Data
-- Database: greyagram_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS `greyagram_db` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `greyagram_db`;

-- ------------------------------------------------------------
-- 1. Table structure for table `migrations`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `migrations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `migration` VARCHAR(255) NOT NULL UNIQUE,
    `batch` INT NOT NULL,
    `executed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Table structure for table `users`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Table structure for table `products`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `stock` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_products_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Table structure for table `diagrams`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `diagrams` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'class',
    `code` LONGTEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_diagrams_user_id` (`user_id`),
    INDEX `idx_diagrams_created` (`created_at`),
    CONSTRAINT `fk_diagrams_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Table structure for table `activities`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activities` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NULL,
    `action` VARCHAR(255) NOT NULL,
    `details` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_activities_user` (`user_id`),
    INDEX `idx_activities_created` (`created_at`),
    CONSTRAINT `fk_activities_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Initial Seeding (Default Users, Products, Diagrams)
-- Password default: 'password' (bcrypt hash)
-- ------------------------------------------------------------
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `created_at`, `updated_at`) 
VALUES
(1, 'Administrator Greyagram', 'admin@greyagram.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NOW(), NOW()),
(2, 'User Demo', 'user@greyagram.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `products` (`id`, `name`, `description`, `price`, `stock`, `created_at`, `updated_at`)
VALUES
(1, 'Greyagram Pro License', 'Lisensi tahunan Greyagram versi Pro', 299000.00, 100, NOW(), NOW()),
(2, 'Custom Diagram Template Pack', 'Koleksi 50+ template UML dan Mermaid modern', 75000.00, 500, NOW(), NOW()),
(3, 'Enterprise Architecture Addon', 'Modul integrasi cloud dan ekspor enterprise SVG/PNG', 599000.00, 50, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `diagrams` (`id`, `user_id`, `title`, `description`, `type`, `code`, `created_at`, `updated_at`)
VALUES
(1, 1, 'E-Commerce Architecture Diagram', 'Diagram kelas relasi e-commerce utama', 'class', 
'classDiagram\n    class User {\n        +int id\n        +string name\n        +string email\n        +login()\n        +logout()\n    }\n    class Customer {\n        +string address\n        +string phone\n        +checkout()\n    }\n    class Order {\n        +int id\n        +string orderNumber\n        +float totalAmount\n        +calculateTotal()\n    }\n    User <|-- Customer : extends\n    Customer "1" --> "*" Order : places',
NOW(), NOW())
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `activities` (`id`, `user_id`, `action`, `details`, `ip_address`, `created_at`)
VALUES
(1, 1, 'Inisialisasi database sistem', 'Migrasi dan skema awal selesai dibuat', '127.0.0.1', NOW()),
(2, 1, 'Membuat proyek diagram baru', 'Membuat diagram E-Commerce Architecture Diagram', '127.0.0.1', NOW())
ON DUPLICATE KEY UPDATE `action` = VALUES(`action`);


<?php

/**
 * Migration: Create Products Table
 */

return [
    'up' => function (PDO $db): void {
        $sql = "CREATE TABLE IF NOT EXISTS products (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            description TEXT NULL,
            price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
            stock INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_products_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

        $db->exec($sql);
    },

    'down' => function (PDO $db): void {
        $db->exec("DROP TABLE IF EXISTS products;");
    }
];


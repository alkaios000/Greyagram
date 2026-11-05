<?php

/**
 * Migration: Create Diagrams Table
 */

return [
    'up' => function (PDO $db): void {
        $sql = "CREATE TABLE IF NOT EXISTS diagrams (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT UNSIGNED NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'class',
            code LONGTEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_diagrams_user_id (user_id),
            INDEX idx_diagrams_created (created_at),
            CONSTRAINT fk_diagrams_user FOREIGN KEY (user_id) 
                REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

        $db->exec($sql);
    },

    'down' => function (PDO $db): void {
        $db->exec("DROP TABLE IF EXISTS diagrams;");
    }
];


<?php

/**
 * Migration: Create Activities Table
 */

return [
    'up' => function (PDO $db): void {
        $sql = "CREATE TABLE IF NOT EXISTS activities (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT UNSIGNED NULL,
            action VARCHAR(255) NOT NULL,
            details TEXT NULL,
            ip_address VARCHAR(45) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_activities_user (user_id),
            INDEX idx_activities_created (created_at),
            CONSTRAINT fk_activities_user FOREIGN KEY (user_id) 
                REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

        $db->exec($sql);
    },

    'down' => function (PDO $db): void {
        $db->exec("DROP TABLE IF EXISTS activities;");
    }
];


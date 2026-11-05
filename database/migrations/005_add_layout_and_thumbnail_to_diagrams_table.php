<?php

/**
 * Migration: Add layout_data and thumbnail to diagrams table
 * Menyimpan koordinat posisi card (x, y) dan thumbnail preview per diagram.
 */

return [
    'up' => function (PDO $db): void {
        // Cek apakah kolom layout_data sudah ada
        $checkLayout = $db->query("SHOW COLUMNS FROM diagrams LIKE 'layout_data'");
        if ($checkLayout->rowCount() === 0) {
            $db->exec("ALTER TABLE diagrams ADD COLUMN layout_data LONGTEXT NULL AFTER code;");
        }

        // Cek apakah kolom thumbnail sudah ada
        $checkThumb = $db->query("SHOW COLUMNS FROM diagrams LIKE 'thumbnail'");
        if ($checkThumb->rowCount() === 0) {
            $db->exec("ALTER TABLE diagrams ADD COLUMN thumbnail LONGTEXT NULL AFTER layout_data;");
        }
    },

    'down' => function (PDO $db): void {
        $db->exec("ALTER TABLE diagrams DROP COLUMN IF EXISTS thumbnail;");
        $db->exec("ALTER TABLE diagrams DROP COLUMN IF EXISTS layout_data;");
    }
];


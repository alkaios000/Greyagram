<?php

/**
 * Greyagram - Database Migration & Seeder CLI Runner
 * Menjalankan migrasi dan seeding database secara terstruktur dan terversioning.
 *
 * Penggunaan:
 *   php database/migrate.php          (Jalankan migrasi tertunda)
 *   php database/migrate.php --seed   (Jalankan migrasi sekaligus seeding)
 *   php database/migrate.php --fresh  (Reset dan bangun ulang database dari awal)
 */

declare(strict_types=1);

// Muat environment
require_once __DIR__ . '/../config/app.php';

$host = $_ENV['DB_HOST'] ?? '127.0.0.1';
$port = (int) ($_ENV['DB_PORT'] ?? 3306);
$dbName = $_ENV['DB_DATABASE'] ?? 'greyagram_db';
$user = $_ENV['DB_USERNAME'] ?? 'root';
$pass = $_ENV['DB_PASSWORD'] ?? '';

echo "====================================================\n";
echo " Greyagram - Database Migration Tool\n";
echo "====================================================\n";
echo "Host: {$host}:{$port} | Database: {$dbName}\n\n";

try {
    // 1. Hubungkan ke MySQL server
    $dsnServer = "mysql:host={$host};port={$port};charset=utf8mb4";
    $pdo = new PDO($dsnServer, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Opsi CLI
    $isFresh = in_array('--fresh', $argv, true);
    $withSeed = in_array('--seed', $argv, true) || $isFresh;

    if ($isFresh) {
        echo "[!] Mereset database '{$dbName}' (--fresh)...\n";
        $pdo->exec("DROP DATABASE IF EXISTS `{$dbName}`;");
    }

    // 2. Buat database jika belum ada
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    $pdo->exec("USE `{$dbName}`;");
    echo "[✓] Database '{$dbName}' siap digunakan.\n";

    // 3. Buat tabel pencatat migrasi (migrations table)
    $pdo->exec("CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL UNIQUE,
        batch INT NOT NULL,
        executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Ambil riwayat migrasi yang sudah dieksekusi
    $stmt = $pdo->query("SELECT migration FROM migrations");
    $executed = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Ambil batch number tertinggi berikutnya
    $stmtBatch = $pdo->query("SELECT MAX(batch) FROM migrations");
    $currentBatch = ((int) $stmtBatch->fetchColumn()) + 1;

    // 4. Pindai berkas migrasi
    $migrationDir = __DIR__ . '/migrations';
    $files = glob($migrationDir . '/*.php');
    sort($files);

    $pending = 0;

    foreach ($files as $filePath) {
        $fileName = basename($filePath, '.php');

        if (in_array($fileName, $executed, true)) {
            continue;
        }

        echo "Menjalankan migrasi: {$fileName}... ";

        $migration = require $filePath;
        if (is_array($migration) && isset($migration['up']) && is_callable($migration['up'])) {
            $migration['up']($pdo);

            $ins = $pdo->prepare("INSERT INTO migrations (migration, batch, executed_at) VALUES (:m, :b, NOW())");
            $ins->execute(['m' => $fileName, 'b' => $currentBatch]);

            echo "[OK]\n";
            $pending++;
        } else {
            echo "[SKIPPED - Format tidak valid]\n";
        }
    }

    if ($pending === 0) {
        echo "[i] Tidak ada migrasi baru. Struktur tabel sudah mutakhir.\n";
    } else {
        echo "[✓] Berhasil menjalankan {$pending} migrasi (Batch {$currentBatch}).\n";
    }

    // 5. Jalankan Seeder jika diminta
    if ($withSeed) {
        echo "\n----------------------------------------------------\n";
        $seederFile = __DIR__ . '/seeders/database_seeder.php';
        if (file_exists($seederFile)) {
            $seeder = require $seederFile;
            if (is_array($seeder) && isset($seeder['run']) && is_callable($seeder['run'])) {
                $seeder['run']($pdo);
            }
        }
    }

    echo "\n====================================================\n";
    echo " Proses database selesai dengan sukses!\n";
    echo "====================================================\n";

} catch (PDOException $e) {
    echo "\n[ERROR PDO] " . $e->getMessage() . "\n";
    exit(1);
} catch (Throwable $e) {
    echo "\n[FATAL ERROR] " . $e->getMessage() . "\n";
    exit(1);
}


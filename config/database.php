<?php

/**
 * Koneksi Database menggunakan PDO
 */

class Database
{
    private static ?PDO $instance = null;

    /**
     * Dapatkan koneksi PDO (Singleton)
     */
    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
            $port = $_ENV['DB_PORT'] ?? '3306';
            $db   = $_ENV['DB_DATABASE'] ?? 'greyagram_db';
            $user = $_ENV['DB_USERNAME'] ?? 'root';
            $pass = $_ENV['DB_PASSWORD'] ?? '';
            $charset = 'utf8mb4';

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                // Catat log error ke storage/logs/error.log
                $log_dir = __DIR__ . '/../storage/logs';
                if (!is_dir($log_dir)) {
                    mkdir($log_dir, 0755, true);
                }
                file_put_contents(
                    $log_dir . '/error.log',
                    '[' . date('Y-m-d H:i:s') . '] Database Connection Error: ' . $e->getMessage() . PHP_EOL,
                    FILE_APPEND
                );
                throw new Exception('Koneksi ke database gagal. Silakan periksa konfigurasi database Anda.');
            }
        }

        return self::$instance;
    }
}

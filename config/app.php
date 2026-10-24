<?php

// Muat variabel .env ke $_ENV dan putenv
if (file_exists(__DIR__ . '/../.env')) {
    $env_lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($env_lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (str_contains($line, '=')) {
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            if (!isset($_ENV[$key])) {
                $_ENV[$key] = $value;
                putenv("{$key}={$value}");
            }
        }
    }
}

// Konfigurasi umum aplikasi
return [
    'app_name' => $_ENV['APP_NAME'] ?? 'Greyagram',
    'app_env' => $_ENV['APP_ENV'] ?? 'development',
    'app_debug' => filter_var($_ENV['APP_DEBUG'] ?? true, FILTER_VALIDATE_BOOLEAN),
    'app_url' => rtrim($_ENV['APP_URL'] ?? 'http://localhost/Greyagram', '/'),
    'timezone' => 'Asia/Jakarta',
    'session_lifetime' => (int) ($_ENV['SESSION_LIFETIME'] ?? 120),
];

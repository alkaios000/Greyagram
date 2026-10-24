<?php

/**
 * Security Helper
 * Fungsi bantu sanitasi input, pencegahan XSS, CSRF, dan hashing password.
 */

if (!function_exists('sanitize_input')) {
    /**
     * Sanitasi data input string atau array
     */
    function sanitize_input(mixed $data): mixed
    {
        if (is_array($data)) {
            return array_map('sanitize_input', $data);
        }
        return htmlspecialchars(trim((string) $data), ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('e')) {
    /**
     * Escape output untuk mencegah XSS
     */
    function e(?string $value): string
    {
        return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('csrf_token')) {
    /**
     * Dapatkan atau buat token CSRF baru
     */
    function csrf_token(): string
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }
}

if (!function_exists('csrf_field')) {
    /**
     * Render hidden input form untuk CSRF token
     */
    function csrf_field(): string
    {
        return '<input type="hidden" name="csrf_token" value="' . csrf_token() . '">';
    }
}

if (!function_exists('verify_csrf_token')) {
    /**
     * Validasi token CSRF dari request POST
     */
    function verify_csrf_token(?string $token = null): bool
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $token = $token ?? $_POST['csrf_token'] ?? '';
        return !empty($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
    }
}

if (!function_exists('hash_password')) {
    /**
     * Enkripsi password menggunakan Bcrypt / default aman
     */
    function hash_password(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT);
    }
}

if (!function_exists('verify_password')) {
    /**
     * Verifikasi kecocokan password dengan hash
     */
    function verify_password(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }
}

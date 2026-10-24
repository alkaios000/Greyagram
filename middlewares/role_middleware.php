<?php

/**
 * Role Middleware
 * Memeriksa hak akses peran (Role-Based Access Control) pengguna.
 */

class RoleMiddleware
{
    /**
     * Pastikan peran pengguna sesuai dengan peran yang diizinkan
     *
     * @param array $allowed_roles Daftar peran yang diizinkan (misal ['admin', 'manager'])
     */
    public static function check(array $allowed_roles): void
    {
        AuthMiddleware::check();

        $user_role = $_SESSION['user']['role'] ?? 'user';

        if (!in_array($user_role, $allowed_roles, true)) {
            http_response_code(403);
            require_once __DIR__ . '/../views/layouts/header.php';
            echo '<div class="container py-5 text-center"><h1>403 - Akses Ditolak</h1><p>Anda tidak memiliki hak akses ke halaman ini.</p><a href="' . base_url('dashboard') . '" class="btn btn-primary">Kembali ke Dashboard</a></div>';
            require_once __DIR__ . '/../views/layouts/footer.php';
            exit;
        }
    }
}

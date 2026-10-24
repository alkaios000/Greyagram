<?php

/**
 * Auth Middleware
 * Memeriksa status otentikasi pengguna sebelum mengakses route tertentu.
 */

class AuthMiddleware
{
    /**
     * Pastikan pengguna sudah terautentikasi
     */
    public static function check(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (empty($_SESSION['user'])) {
            $_SESSION['flash_error'] = 'Silakan login terlebih dahulu untuk mengakses halaman ini.';
            redirect('login');
        }
    }

    /**
     * Pastikan pengguna adalah tamu (belum login)
     */
    public static function guest(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!empty($_SESSION['user'])) {
            redirect('dashboard');
        }
    }
}

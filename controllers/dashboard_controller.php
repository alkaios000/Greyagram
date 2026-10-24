<?php

/**
 * Dashboard Controller
 * Mengatur alur logika tampilan dashboard utama dan ringkasan data.
 */

require_once __DIR__ . '/../middlewares/auth_middleware.php';

class DashboardController
{
    /**
     * Tampilkan halaman dashboard utama
     */
    public function index(): void
    {
        // Pastikan pengguna sudah login
        AuthMiddleware::check();

        $user = $_SESSION['user'] ?? ['name' => 'Pengguna', 'role' => 'user'];
        $page_title = 'Dashboard Utama';

        // Data ringkasan (dummy / placeholder untuk integrasi awal)
        $stats = [
            'total_users' => 12,
            'total_products' => 38,
            'active_sessions' => 4,
            'recent_activities' => [
                ['user' => 'Alkaios', 'action' => 'Membuat proyek baru', 'time' => '10 menit yang lalu'],
                ['user' => 'Admin', 'action' => 'Memperbarui konfigurasi sistem', 'time' => '1 jam yang lalu'],
            ]
        ];

        require_once __DIR__ . '/../views/dashboard/index_view.php';
    }
}

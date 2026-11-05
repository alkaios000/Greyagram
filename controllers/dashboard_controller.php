<?php

/**
 * Dashboard Controller
 * Mengatur alur logika tampilan dashboard utama dan ringkasan data.
 */

require_once __DIR__ . '/../config/database.php';
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

        // Ambil data ringkasan langsung dari database
        try {
            $db = Database::getConnection();

            $totalUsers = (int) $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
            $totalProducts = (int) $db->query("SELECT COUNT(*) FROM products")->fetchColumn();
            $totalDiagrams = (int) $db->query("SELECT COUNT(*) FROM diagrams")->fetchColumn();

            $stmtAct = $db->query("SELECT a.action, a.created_at, COALESCE(u.name, 'Sistem') as user_name 
                                   FROM activities a 
                                   LEFT JOIN users u ON a.user_id = u.id 
                                   ORDER BY a.id DESC LIMIT 5");
            $recentActs = [];
            while ($row = $stmtAct->fetch()) {
                $recentActs[] = [
                    'user'   => $row['user_name'],
                    'action' => $row['action'],
                    'time'   => date('d M Y H:i', strtotime($row['created_at']))
                ];
            }

            $stats = [
                'total_users'       => $totalUsers,
                'total_products'    => $totalProducts,
                'active_sessions'   => max(1, $totalDiagrams),
                'recent_activities' => $recentActs
            ];
        } catch (Throwable $e) {
            $stats = [
                'total_users'       => 0,
                'total_products'    => 0,
                'active_sessions'   => 0,
                'recent_activities' => []
            ];
        }

        require_once __DIR__ . '/../views/dashboard/index_view.php';
    }
}

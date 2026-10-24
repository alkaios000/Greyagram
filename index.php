<?php

/**
 * Greyagram - Single Entry Point
 * Seluruh request aplikasi diarahkan melalui file ini.
 */

// Inisialisasi session jika belum aktif
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Muat konfigurasi aplikasi & helpers
$config = require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/helpers/security_helper.php';
require_once __DIR__ . '/helpers/url_helper.php';

// Atur timezone
date_default_timezone_set($config['timezone'] ?? 'Asia/Jakarta');

// Error reporting sesuai environment
if ($config['app_debug']) {
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(0);
}

// Tangkap route URL
$url = isset($_GET['url']) ? trim($_GET['url'], '/') : '';

try {
    switch ($url) {
        case '':
        case 'dashboard':
            require_once __DIR__ . '/controllers/dashboard_controller.php';
            $controller = new DashboardController();
            $controller->index();
            break;

        case 'login':
            require_once __DIR__ . '/controllers/auth_controller.php';
            $controller = new AuthController();
            $controller->showLogin();
            break;

        case 'login/process':
            require_once __DIR__ . '/controllers/auth_controller.php';
            $controller = new AuthController();
            $controller->login();
            break;

        case 'logout':
            require_once __DIR__ . '/controllers/auth_controller.php';
            $controller = new AuthController();
            $controller->logout();
            break;

        case 'users':
            require_once __DIR__ . '/controllers/user_controller.php';
            $controller = new UserController();
            $controller->index();
            break;

        default:
            http_response_code(404);
            $page_title = '404 - Halaman Tidak Ditemukan';
            require_once __DIR__ . '/views/layouts/header.php';
            ?>
            <main class="main-content" style="align-items: center; justify-content: center; text-align: center;">
                <div class="card" style="max-width: 450px; width: 100%; padding: 2rem;">
                    <h1 style="font-size: 3rem; color: var(--btn-primary); margin-bottom: 0.5rem;">404</h1>
                    <h2 style="margin-bottom: 0.5rem;">Halaman Tidak Ditemukan</h2>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.</p>
                    <a href="<?= base_url('dashboard') ?>" class="btn btn-primary">
                        <i class="fa-solid fa-house"></i>
                        <span>Kembali ke Beranda</span>
                    </a>
                </div>
            </main>
            <?php
            require_once __DIR__ . '/views/layouts/footer.php';
            break;
    }
} catch (Throwable $e) {
    // Catat log error sistem
    $log_dir = __DIR__ . '/storage/logs';
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }
    file_put_contents(
        $log_dir . '/error.log',
        '[' . date('Y-m-d H:i:s') . '] Fatal Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine() . PHP_EOL,
        FILE_APPEND
    );

    http_response_code(500);
    if ($config['app_debug']) {
        echo '<h1>500 - Server Error</h1>';
        echo '<p><strong>Pesan:</strong> ' . htmlspecialchars($e->getMessage()) . '</p>';
        echo '<p><strong>Lokasi:</strong> ' . htmlspecialchars($e->getFile()) . ':' . $e->getLine() . '</p>';
        echo '<pre>' . htmlspecialchars($e->getTraceAsString()) . '</pre>';
    } else {
        echo '<h1>500 - Terjadi Kesalahan pada Server</h1>';
        echo '<p>Silakan hubungi administrator sistem jika masalah berlanjut.</p>';
    }
}

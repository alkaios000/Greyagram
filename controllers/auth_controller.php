<?php

/**
 * Auth Controller
 * Mengatur alur logika autentikasi (login, logout, session management).
 */

require_once __DIR__ . '/../models/user_model.php';
require_once __DIR__ . '/../middlewares/auth_middleware.php';

class AuthController
{
    /**
     * Tampilkan halaman login
     */
    public function showLogin(): void
    {
        AuthMiddleware::guest();

        $error = $_SESSION['flash_error'] ?? null;
        unset($_SESSION['flash_error']);

        require_once __DIR__ . '/../views/auth/login_view.php';
    }

    /**
     * Proses autentikasi pengguna
     */
    public function login(): void
    {
        AuthMiddleware::guest();

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            redirect('login');
        }

        if (!verify_csrf_token()) {
            $_SESSION['flash_error'] = 'Token keamanan tidak valid. Silakan coba lagi.';
            redirect('login');
        }

        $email = filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL);
        $password = (string) ($_POST['password'] ?? '');

        if (empty($email) || empty($password)) {
            $_SESSION['flash_error'] = 'Email dan password wajib diisi.';
            redirect('login');
        }

        try {
            $user_model = new UserModel();
            $user = $user_model->findByEmail($email);

            if ($user && verify_password($password, $user['password'])) {
                // Regenerasi session ID untuk mencegah session fixation
                session_regenerate_id(true);

                $_SESSION['user'] = [
                    'id'    => $user['id'],
                    'name'  => $user['name'],
                    'email' => $user['email'],
                    'role'  => $user['role'],
                ];

                redirect('dashboard');
            } else {
                $_SESSION['flash_error'] = 'Kredensial tidak cocok dengan data kami.';
                redirect('login');
            }
        } catch (Exception $e) {
            $_SESSION['flash_error'] = 'Terjadi kesalahan sistem: ' . $e->getMessage();
            redirect('login');
        }
    }

    /**
     * Keluar dari sesi aplikasi
     */
    public function logout(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $_SESSION = [];

        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }

        session_destroy();
        redirect('login');
    }
}

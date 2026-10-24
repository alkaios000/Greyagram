<?php

/**
 * User Controller
 * Mengatur pengelolaan data profil pengguna dan manajemen user.
 */

require_once __DIR__ . '/../models/user_model.php';
require_once __DIR__ . '/../middlewares/auth_middleware.php';

class UserController
{
    /**
     * Daftar pengguna (khusus role yang berwenang)
     */
    public function index(): void
    {
        AuthMiddleware::check();

        $page_title = 'Manajemen Pengguna';
        $user_model = new UserModel();

        try {
            $users = $user_model->getAll();
        } catch (Exception $e) {
            $users = [];
            $error_message = $e->getMessage();
        }

        // Render view manajemen pengguna (bisa menggunakan dashboard layout atau template view)
        require_once __DIR__ . '/../views/layouts/header.php';
        require_once __DIR__ . '/../views/layouts/sidebar.php';
        ?>
        <main class="main-content">
            <header class="content-header">
                <h1 class="page-title"><?= e($page_title) ?></h1>
            </header>
            <div class="content-body">
                <div class="card">
                    <div class="card-header">
                        <h2>Daftar Pengguna Terdaftar</h2>
                    </div>
                    <div class="card-body">
                        <?php if (!empty($error_message)): ?>
                            <p class="text-danger"><?= e($error_message) ?></p>
                        <?php endif; ?>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nama</th>
                                        <th>Email</th>
                                        <th>Peran</th>
                                        <th>Terdaftar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if (!empty($users)): ?>
                                        <?php foreach ($users as $u): ?>
                                            <tr>
                                                <td><?= e((string)$u['id']) ?></td>
                                                <td><?= e($u['name']) ?></td>
                                                <td><?= e($u['email']) ?></td>
                                                <td><span class="badge"><?= e($u['role']) ?></span></td>
                                                <td><?= e($u['created_at'] ?? '-') ?></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php else: ?>
                                        <tr>
                                            <td colspan="5" class="text-center">Belum ada data pengguna yang tersedia.</td>
                                        </tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </main>
        <?php
        require_once __DIR__ . '/../views/layouts/footer.php';
    }
}

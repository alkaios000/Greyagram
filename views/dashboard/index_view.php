<?php
require_once __DIR__ . '/../layouts/header.php';
require_once __DIR__ . '/../layouts/sidebar.php';
?>

<main class="main-content">
    <header class="content-header">
        <div class="header-titles">
            <h1 class="page-title">Dashboard</h1>
            <p class="page-subtitle">Selamat datang kembali di panel kerja Greyagram.</p>
        </div>
        <div class="header-actions">
            <a href="<?= base_url('users') ?>" class="btn btn-primary">
                <i class="fa-solid fa-users"></i>
                <span>Kelola Pengguna</span>
            </a>
        </div>
    </header>

    <div class="content-body">
        <section class="stats-grid">
            <div class="stat-card">
                <span class="stat-label">Total Pengguna</span>
                <span class="stat-value"><?= (int) ($stats['total_users'] ?? 0) ?></span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Total Proyek / Produk</span>
                <span class="stat-value"><?= (int) ($stats['total_products'] ?? 0) ?></span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Sesi Aktif</span>
                <span class="stat-value"><?= (int) ($stats['active_sessions'] ?? 0) ?></span>
            </div>
        </section>

        <section class="card mt-4">
            <div class="card-header">
                <h2>Aktivitas Terbaru</h2>
            </div>
            <div class="card-body">
                <ul class="activity-list">
                    <?php if (!empty($stats['recent_activities'])): ?>
                        <?php foreach ($stats['recent_activities'] as $act): ?>
                            <li class="activity-item">
                                <span class="activity-user"><?= e($act['user']) ?></span>
                                <span class="activity-desc"><?= e($act['action']) ?></span>
                                <span class="activity-time"><?= e($act['time']) ?></span>
                            </li>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <li class="activity-item text-muted">Belum ada aktivitas baru.</li>
                    <?php endif; ?>
                </ul>
            </div>
        </section>
    </div>
</main>

<?php
require_once __DIR__ . '/../layouts/footer.php';
?>

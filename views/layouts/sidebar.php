<?php
// Sidebar layout
$current_url = current_url();
$user_name = $_SESSION['user']['name'] ?? 'Pengguna';
$user_role = $_SESSION['user']['role'] ?? 'User';
?>
<aside class="app-sidebar" id="appSidebar">
    <div class="sidebar-brand">
        <a href="<?= base_url('dashboard') ?>" class="brand-link">
            <span class="brand-text">Greyagram</span>
        </a>
    </div>

    <div class="sidebar-user">
        <div class="user-avatar">
            <i class="fa-solid fa-user"></i>
        </div>
        <div class="user-info">
            <span class="user-name"><?= e($user_name) ?></span>
            <span class="user-role"><?= e(ucfirst($user_role)) ?></span>
        </div>
    </div>

    <nav class="sidebar-nav">
        <ul class="nav-list">
            <li class="nav-item">
                <a href="<?= base_url('dashboard') ?>" class="nav-link <?= str_contains($current_url, 'dashboard') ? 'active' : '' ?>">
                    <i class="fa-solid fa-gauge-high nav-icon"></i>
                    <span>Dashboard</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="<?= base_url('users') ?>" class="nav-link <?= str_contains($current_url, 'users') ? 'active' : '' ?>">
                    <i class="fa-solid fa-users nav-icon"></i>
                    <span>Pengguna</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="<?= base_url('logout') ?>" class="nav-link nav-link-logout">
                    <i class="fa-solid fa-right-from-bracket nav-icon"></i>
                    <span>Keluar</span>
                </a>
            </li>
        </ul>
    </nav>
</aside>

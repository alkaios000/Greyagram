<?php
$page_title = 'Proyek Saya';
require_once __DIR__ . '/../layouts/header.php';
require_once __DIR__ . '/../layouts/sidebar.php';

function format_time_ago($datetime) {
    if (!$datetime) return 'Baru saja';
    $time = strtotime($datetime);
    $diff = time() - $time;
    if ($diff < 60) return 'Baru saja';
    if ($diff < 3600) return floor($diff / 60) . ' menit yang lalu';
    if ($diff < 86400) return floor($diff / 3600) . ' jam yang lalu';
    if ($diff < 2592000) return floor($diff / 86400) . ' hari yang lalu';
    return date('d M Y, H:i', $time);
}
?>

<main class="main-content projects-main-layout">
    <header class="content-header">
        <div class="header-titles">
            <h1 class="page-title">Proyek &amp; Diagram Saya</h1>
            <p class="page-subtitle">Kelola seluruh lembar kerja diagram, pratinjau thumbnail, dan lanjutkan perancangan arsitektur sistem Anda.</p>
        </div>
        <div class="header-actions">
            <a href="<?= base_url('diagram') ?>" class="btn btn-primary">
                <i class="fa-solid fa-plus"></i>
                <span>Buat Diagram Baru</span>
            </a>
        </div>
    </header>

    <div class="content-body">
        <!-- Search & Filter Bar -->
        <div class="projects-filter-bar">
            <div class="search-input-wrap">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input type="text" id="projectSearchInput" class="form-control" placeholder="Cari nama diagram atau deskripsi..." autocomplete="off">
            </div>
            <div class="project-count-badge">
                <span id="projectCountDisplay"><?= count($diagrams) ?></span> Proyek Tersimpan
            </div>
        </div>

        <!-- Projects Grid -->
        <div class="projects-grid" id="projectsGrid">
            <!-- Create New Card -->
            <a href="<?= base_url('diagram') ?>" class="project-card project-card-new" title="Mulai Lembar Kerja Diagram Baru">
                <div class="new-card-inner">
                    <div class="new-card-icon">
                        <i class="fa-solid fa-plus"></i>
                    </div>
                    <h3 class="new-card-title">Buat Diagram Baru</h3>
                    <p class="new-card-desc">Buka workspace kosong atau pilih dari template kelas arsitektur.</p>
                </div>
            </a>

            <?php if (!empty($diagrams)): ?>
                <?php foreach ($diagrams as $d): ?>
                    <div class="project-card" data-id="<?= (int)$d['id'] ?>" data-title="<?= htmlspecialchars(strtolower($d['title']), ENT_QUOTES, 'UTF-8') ?>" data-desc="<?= htmlspecialchars(strtolower($d['description'] ?? ''), ENT_QUOTES, 'UTF-8') ?>">
                        <!-- Thumbnail Area -->
                        <div class="project-thumb-container">
                            <?php if (!empty($d['thumbnail'])): ?>
                                <img src="<?= htmlspecialchars($d['thumbnail'], ENT_QUOTES, 'UTF-8') ?>" class="project-thumb-img" alt="<?= htmlspecialchars($d['title'], ENT_QUOTES, 'UTF-8') ?>" loading="lazy">
                            <?php else: ?>
                                <div class="project-thumb-placeholder">
                                    <div class="placeholder-grid-pattern"></div>
                                    <div class="placeholder-icon-wrap">
                                        <i class="fa-solid fa-diagram-project"></i>
                                    </div>
                                    <span class="placeholder-label">Pratinjau Belum Tersedia</span>
                                </div>
                            <?php endif; ?>

                            <!-- Hover Overlay -->
                            <div class="project-thumb-overlay">
                                <a href="<?= base_url('diagram?id=' . (int)$d['id']) ?>" class="btn btn-sm btn-primary">
                                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                    <span>Buka di Workspace</span>
                                </a>
                            </div>

                            <span class="badge-diagram-type"><?= htmlspecialchars(ucfirst($d['type'] ?? 'Class'), ENT_QUOTES, 'UTF-8') ?></span>
                        </div>

                        <!-- Card Body -->
                        <div class="project-card-body">
                            <h3 class="project-title" title="<?= htmlspecialchars($d['title'], ENT_QUOTES, 'UTF-8') ?>">
                                <a href="<?= base_url('diagram?id=' . (int)$d['id']) ?>">
                                    <?= htmlspecialchars($d['title'], ENT_QUOTES, 'UTF-8') ?>
                                </a>
                            </h3>
                            <p class="project-desc">
                                <?= !empty($d['description']) ? htmlspecialchars($d['description'], ENT_QUOTES, 'UTF-8') : 'Tidak ada keterangan tambahan.' ?>
                            </p>
                            <div class="project-meta">
                                <span class="meta-time" title="Diperbarui: <?= htmlspecialchars($d['updated_at'], ENT_QUOTES, 'UTF-8') ?>">
                                    <i class="fa-regular fa-clock"></i>
                                    <span><?= format_time_ago($d['updated_at']) ?></span>
                                </span>
                                <?php if (!empty($d['layout_data'])): ?>
                                    <span class="badge-layout-saved" title="Posisi kartu diagram telah disesuaikan manual">
                                        <i class="fa-solid fa-thumbtack"></i> Posisi Terkunci
                                    </span>
                                <?php endif; ?>
                            </div>
                        </div>

                        <!-- Card Footer / Actions -->
                        <div class="project-card-footer">
                            <a href="<?= base_url('diagram?id=' . (int)$d['id']) ?>" class="btn btn-sm btn-outline btn-action" title="Buka di Workspace">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka
                            </a>
                            <div class="card-action-group">
                                <button type="button" class="btn btn-icon btn-sm btn-rename" data-id="<?= (int)$d['id'] ?>" data-title="<?= htmlspecialchars($d['title'], ENT_QUOTES, 'UTF-8') ?>" title="Ganti Nama">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button type="button" class="btn btn-icon btn-sm btn-duplicate" data-id="<?= (int)$d['id'] ?>" title="Duplikasi Diagram">
                                    <i class="fa-solid fa-copy"></i>
                                </button>
                                <button type="button" class="btn btn-icon btn-sm text-danger btn-delete" data-id="<?= (int)$d['id'] ?>" data-title="<?= htmlspecialchars($d['title'], ENT_QUOTES, 'UTF-8') ?>" title="Hapus Diagram">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>

        <!-- Empty Search State -->
        <div id="emptySearchState" class="empty-state-wrap" style="display: none;">
            <i class="fa-solid fa-magnifying-glass empty-icon"></i>
            <h3>Diagram Tidak Ditemukan</h3>
            <p>Tidak ada diagram yang cocok dengan kata kunci pencarian Anda.</p>
        </div>
    </div>
</main>

<!-- Modal Rename Diagram -->
<div class="diagram-modal-backdrop" id="modalRenameProject" style="display: none;">
    <div class="diagram-modal" style="max-width: 440px;">
        <div class="diagram-modal-header">
            <h3><i class="fa-solid fa-pen"></i> Ganti Nama Diagram</h3>
            <button type="button" class="modal-close-icon" id="btnCloseRenameModal">&times;</button>
        </div>
        <div class="diagram-modal-body">
            <input type="hidden" id="renameProjectId">
            <div class="form-group mb-3">
                <label for="renameProjectTitle" class="form-label font-weight-bold">Nama Diagram Baru</label>
                <input type="text" id="renameProjectTitle" class="form-control" placeholder="Contoh: Arsitektur E-Commerce v2">
            </div>
        </div>
        <div class="diagram-modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelRename">Batal</button>
            <button type="button" class="btn btn-primary" id="btnSubmitRename">
                <i class="fa-solid fa-check"></i> Simpan Nama
            </button>
        </div>
    </div>
</div>

<!-- Modal Delete Confirmation -->
<div class="diagram-modal-backdrop" id="modalDeleteProject" style="display: none;">
    <div class="diagram-modal" style="max-width: 420px;">
        <div class="diagram-modal-header">
            <h3 class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Hapus Diagram?</h3>
            <button type="button" class="modal-close-icon" id="btnCloseDeleteModal">&times;</button>
        </div>
        <div class="diagram-modal-body">
            <input type="hidden" id="deleteProjectId">
            <p>Apakah Anda yakin ingin menghapus diagram <strong id="deleteProjectTitleDisplay"></strong>?</p>
            <p class="text-muted" style="font-size: 0.82rem; margin-bottom: 0;">Tindakan ini permanen dan tidak dapat dibatalkan.</p>
        </div>
        <div class="diagram-modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelDelete">Batal</button>
            <button type="button" class="btn btn-danger" id="btnSubmitDelete" style="background: #ef4444; color: #ffffff; border: none;">
                <i class="fa-solid fa-trash"></i> Ya, Hapus Diagram
            </button>
        </div>
    </div>
</div>

<!-- Toast Notification -->
<div class="diagram-toast" id="projectToast" style="display: none;">
    <i class="fa-solid fa-circle-check toast-icon" id="projectToastIcon"></i>
    <span class="toast-message" id="projectToastMessage"></span>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('projectSearchInput');
    const projectsGrid = document.getElementById('projectsGrid');
    const emptySearch = document.getElementById('emptySearchState');
    const countDisplay = document.getElementById('projectCountDisplay');

    // Live Filter Search
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const query = this.value.trim().toLowerCase();
            const cards = projectsGrid.querySelectorAll('.project-card:not(.project-card-new)');
            let visibleCount = 0;

            cards.forEach(card => {
                const title = card.getAttribute('data-title') || '';
                const desc = card.getAttribute('data-desc') || '';
                if (title.includes(query) || desc.includes(query)) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (countDisplay) countDisplay.textContent = visibleCount;
            if (emptySearch) {
                emptySearch.style.display = (visibleCount === 0 && cards.length > 0) ? 'block' : 'none';
            }
        });
    }

    // Modal Helpers
    function openModal(modal) {
        if (!modal) return;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    function showToast(message, isError = false) {
        const toast = document.getElementById('projectToast');
        const icon = document.getElementById('projectToastIcon');
        const msg = document.getElementById('projectToastMessage');
        if (!toast || !msg) return;

        msg.textContent = message;
        if (isError) {
            icon.className = 'fa-solid fa-circle-exclamation toast-icon text-danger';
        } else {
            icon.className = 'fa-solid fa-circle-check toast-icon text-success';
        }
        toast.style.display = 'flex';
        setTimeout(() => { toast.classList.add('show'); }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        }, 3200);
    }

    // Rename Logic
    const modalRename = document.getElementById('modalRenameProject');
    const inputRenameId = document.getElementById('renameProjectId');
    const inputRenameTitle = document.getElementById('renameProjectTitle');
    const btnCloseRename = document.getElementById('btnCloseRenameModal');
    const btnCancelRename = document.getElementById('btnCancelRename');
    const btnSubmitRename = document.getElementById('btnSubmitRename');

    document.querySelectorAll('.btn-rename').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const title = btn.getAttribute('data-title');
            inputRenameId.value = id;
            inputRenameTitle.value = title;
            openModal(modalRename);
            setTimeout(() => inputRenameTitle.focus(), 100);
        });
    });

    if (btnCloseRename) btnCloseRename.addEventListener('click', () => closeModal(modalRename));
    if (btnCancelRename) btnCancelRename.addEventListener('click', () => closeModal(modalRename));

    if (btnSubmitRename) {
        btnSubmitRename.addEventListener('click', async () => {
            const id = inputRenameId.value;
            const newTitle = inputRenameTitle.value.trim();
            if (!newTitle) {
                showToast('Nama diagram tidak boleh kosong.', true);
                return;
            }

            btnSubmitRename.disabled = true;
            btnSubmitRename.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

            try {
                // Ambil kode diagram saat ini untuk update
                const loadRes = await fetch('<?= base_url('diagram/load?id=') ?>' + id);
                const loadData = await loadRes.json();
                if (!loadData.success || !loadData.diagram) throw new Error('Gagal memuat diagram');

                const saveRes = await fetch('<?= base_url('diagram/save') ?>', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: id,
                        title: newTitle,
                        code: loadData.diagram.code
                    })
                });
                const res = await saveRes.json();
                if (res.success) {
                    showToast('Nama diagram berhasil diperbarui!');
                    closeModal(modalRename);
                    setTimeout(() => window.location.reload(), 600);
                } else {
                    showToast(res.message || 'Gagal mengubah nama diagram.', true);
                }
            } catch (err) {
                showToast('Terjadi kesalahan koneksi server.', true);
            } finally {
                btnSubmitRename.disabled = false;
                btnSubmitRename.innerHTML = '<i class="fa-solid fa-check"></i> Simpan Nama';
            }
        });
    }

    // Duplicate Logic
    document.querySelectorAll('.btn-duplicate').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            btn.disabled = true;
            try {
                const res = await fetch('<?= base_url('diagram/duplicate') ?>', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Diagram berhasil diduplikasi!');
                    setTimeout(() => window.location.reload(), 600);
                } else {
                    showToast(data.message || 'Gagal menduplikasi diagram.', true);
                    btn.disabled = false;
                }
            } catch (err) {
                showToast('Gagal menghubungi server.', true);
                btn.disabled = false;
            }
        });
    });

    // Delete Logic
    const modalDelete = document.getElementById('modalDeleteProject');
    const inputDeleteId = document.getElementById('deleteProjectId');
    const titleDeleteDisplay = document.getElementById('deleteProjectTitleDisplay');
    const btnCloseDelete = document.getElementById('btnCloseDeleteModal');
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnSubmitDelete = document.getElementById('btnSubmitDelete');

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const title = btn.getAttribute('data-title');
            inputDeleteId.value = id;
            titleDeleteDisplay.textContent = '"' + title + '"';
            openModal(modalDelete);
        });
    });

    if (btnCloseDelete) btnCloseDelete.addEventListener('click', () => closeModal(modalDelete));
    if (btnCancelDelete) btnCancelDelete.addEventListener('click', () => closeModal(modalDelete));

    if (btnSubmitDelete) {
        btnSubmitDelete.addEventListener('click', async () => {
            const id = inputDeleteId.value;
            btnSubmitDelete.disabled = true;
            btnSubmitDelete.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menghapus...';

            try {
                const res = await fetch('<?= base_url('diagram/delete') ?>', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Diagram berhasil dihapus.');
                    closeModal(modalDelete);
                    const card = document.querySelector(`.project-card[data-id="${id}"]`);
                    if (card) {
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.95)';
                        card.style.transition = 'all 0.3s ease';
                        setTimeout(() => {
                            card.remove();
                            const remain = projectsGrid.querySelectorAll('.project-card:not(.project-card-new)').length;
                            if (countDisplay) countDisplay.textContent = remain;
                        }, 300);
                    }
                } else {
                    showToast(data.message || 'Gagal menghapus diagram.', true);
                }
            } catch (err) {
                showToast('Gagal menghubungi server.', true);
            } finally {
                btnSubmitDelete.disabled = false;
                btnSubmitDelete.innerHTML = '<i class="fa-solid fa-trash"></i> Ya, Hapus Diagram';
            }
        });
    }
});
</script>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>


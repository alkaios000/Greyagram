<?php
$page_title = 'Diagram Workspace';
require_once __DIR__ . '/../layouts/header.php';
require_once __DIR__ . '/../layouts/sidebar.php';
?>

<main class="main-content diagram-main-layout">
    <!-- Top Workspace Toolbar -->
    <header class="diagram-toolbar">
        <div class="toolbar-left">
            <button type="button" class="btn btn-outline toolbar-btn" id="btnToggleEditor" title="Buka / Tutup Editor Kode">
                <i class="fa-solid fa-code"></i>
                <span class="btn-text">Editor Kode</span>
            </button>
            <div class="template-selector-wrap">
                <label for="templateSelect" class="sr-only">Pilih Template</label>
                <select id="templateSelect" class="form-control form-control-sm template-select">
                    <option value="ecommerce">Template: E-Commerce System</option>
                    <option value="attendance">Template: HR & Presensi (Kompleks)</option>
                    <option value="auth">Template: User & Authentication</option>
                    <option value="school">Template: School & Academic</option>
                    <option value="hospital">Template: Hospital & Healthcare</option>
                </select>
            </div>
            <div class="toolbar-divider"></div>
            <a href="<?= base_url('projects') ?>" class="btn btn-outline toolbar-btn" title="Buka Galeri Seluruh Proyek">
                <i class="fa-solid fa-layer-group"></i>
                <span class="btn-text">Proyek Saya</span>
            </a>
            <button type="button" class="btn btn-outline toolbar-btn" id="btnOpenDiagrams" title="Buka Diagram Tersimpan Anda di Database">
                <i class="fa-solid fa-folder-open"></i>
                <span class="btn-text">Buka</span>
            </button>
            <button type="button" class="btn btn-outline toolbar-btn" id="btnSaveDiagram" title="Simpan Diagram ke Database Per User">
                <i class="fa-solid fa-floppy-disk"></i>
                <span class="btn-text">Simpan</span>
            </button>
        </div>

        <div class="toolbar-center">
            <div class="diagram-active-title" id="diagramActiveTitle" title="Diagram Aktif">
                <i class="fa-solid fa-diagram-project"></i>
                <span id="displayDiagramTitle"><?= htmlspecialchars($current_diagram_title, ENT_QUOTES, 'UTF-8') ?></span>
            </div>
            <div id="saveStatusBadge" class="save-status-badge saved" style="display: none;" title="Status penyimpanan diagram">
                <i class="fa-solid fa-circle-check" id="saveStatusIcon"></i>
                <span id="saveStatusText">Tersimpan</span>
            </div>
            <div class="diagram-meta-badge">
                <span id="badgeNodeCount">0 Kelas</span>
                <span class="meta-dot">&bull;</span>
                <span id="badgeRelCount">0 Relasi</span>
            </div>
        </div>

        <div class="toolbar-right">
            <div class="zoom-controls">
                <button type="button" class="btn btn-icon" id="btnZoomOut" title="Zoom Out (-)">
                    <i class="fa-solid fa-minus"></i>
                </button>
                <button type="button" class="btn btn-icon zoom-level-btn" id="btnZoomReset" title="Reset Zoom">
                    <span id="labelZoomPercent">100%</span>
                </button>
                <button type="button" class="btn btn-icon" id="btnZoomIn" title="Zoom In (+)">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>

            <button type="button" class="btn btn-outline toolbar-btn" id="btnAutoFit" title="Sesuaikan Tampilan ke Tengah Layar">
                <i class="fa-solid fa-expand"></i>
                <span class="btn-text">Autofit</span>
            </button>

            <button type="button" class="btn btn-outline toolbar-btn" id="btnRelayout" title="Rapikan Tata Letak Presisi & Sejajar Vertikal">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span class="btn-text">Tata Presisi</span>
            </button>

            <button type="button" class="btn btn-outline toolbar-btn" id="btnExportSvg" title="Unduh Diagram sebagai Berkas Vektor SVG (Resolusi Tak Terbatas)">
                <i class="fa-solid fa-bezier-curve"></i>
                <span class="btn-text">Unduh SVG</span>
            </button>

            <button type="button" class="btn btn-primary toolbar-btn" id="btnExportPng" title="Unduh Diagram sebagai Citra PNG Ultra-HD 4K (Sangat Tajam & Tidak Blur)">
                <i class="fa-solid fa-download"></i>
                <span class="btn-text">Unduh PNG (HD)</span>
            </button>
        </div>
    </header>

    <!-- Workspace Area (Editor + Canvas) -->
    <div class="diagram-workspace-container">
        <!-- Collapsible Code Editor Drawer -->
        <aside class="diagram-editor-drawer" id="diagramEditorDrawer">
            <div class="editor-drawer-header">
                <div class="drawer-title">
                    <i class="fa-solid fa-terminal"></i>
                    <span>Sintaks Mermaid (Class)</span>
                </div>
                <button type="button" class="drawer-close-btn" id="btnCloseDrawer" title="Tutup Editor">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="editor-drawer-body">
                <textarea id="mermaidCodeInput" class="form-control mermaid-textarea" spellcheck="false" placeholder="Tulis kode Mermaid classDiagram di sini..."><?= htmlspecialchars($default_code, ENT_QUOTES, 'UTF-8') ?></textarea>
                
                <div id="parseErrorBanner" class="diagram-error-banner" style="display: none;">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <span id="parseErrorMessage">Terjadi kesalahan sintaks.</span>
                </div>

                <div class="syntax-cheatsheet">
                    <p class="cheatsheet-title"><i class="fa-solid fa-circle-info"></i> Panduan Singkat Relasi:</p>
                    <ul class="cheatsheet-list">
                        <li><code>&lt;|--</code> : Pewarisan (Inheritance)</li>
                        <li><code>*--</code> : Komposisi (Composition)</li>
                        <li><code>o--</code> : Agregasi (Aggregation)</li>
                        <li><code>--&gt;</code> : Asosiasi (Association)</li>
                        <li><code>..&gt;</code> : Dependensi (Dependency)</li>
                        <li><code>+</code> Public &bull; <code>-</code> Private &bull; <code>#</code> Protected</li>
                    </ul>
                </div>
            </div>

            <div class="editor-drawer-footer">
                <button type="button" class="btn btn-primary btn-block" id="btnApplyCode">
                    <i class="fa-solid fa-play"></i>
                    <span>Terapkan ke Kanvas</span>
                </button>
            </div>
        </aside>

        <!-- Canvas Viewport -->
        <section class="diagram-canvas-area" id="diagramCanvasArea">
            <div class="canvas-background"></div>

            <div class="diagram-viewport" id="diagramViewport">
                <!-- SVG Layer untuk Garis Relasi dan Panah -->
                <svg id="diagramSvgLayer" class="diagram-svg-layer" xmlns="http://www.w3.org/2000/svg">
                    <defs></defs>
                </svg>

                <!-- HTML Layer untuk Kartu Kelas yang Draggable -->
                <div id="diagramNodesLayer" class="diagram-nodes-layer"></div>
            </div>

            <!-- Canvas Floating Instructions / Help -->
            <div class="canvas-floating-hint">
                <i class="fa-solid fa-arrows-up-down-left-right"></i>
                <span>Tarik latar untuk Pan &bull; Drag header kartu untuk geser &bull; Scroll untuk Zoom</span>
            </div>
        </section>
    </div>

    <!-- Modal Simpan Diagram -->
    <div class="diagram-modal-backdrop" id="modalSaveDiagram">
        <div class="diagram-modal-box">
            <div class="diagram-modal-header">
                <div class="diagram-modal-title">
                    <i class="fa-solid fa-floppy-disk"></i>
                    <span>Simpan Diagram ke Database</span>
                </div>
                <button type="button" class="diagram-modal-close" id="btnCloseSaveModal" title="Tutup">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="diagram-modal-body">
                <div class="form-group mb-3">
                    <label for="inputSaveTitle" class="form-label font-weight-bold" style="font-size: 0.85rem; color: #374151;">Judul Diagram <span class="text-danger">*</span></label>
                    <input type="text" id="inputSaveTitle" class="form-control" placeholder="Contoh: Arsitektur Sistem Presensi & HR" value="<?= htmlspecialchars($current_diagram_title, ENT_QUOTES, 'UTF-8') ?>">
                </div>
                <div class="form-group mb-2">
                    <label for="inputSaveDesc" class="form-label" style="font-size: 0.85rem; color: #374151;">Deskripsi / Catatan (Opsional)</label>
                    <textarea id="inputSaveDesc" class="form-control" rows="2" placeholder="Catatan versi atau ringkasan diagram..."></textarea>
                </div>
                <p class="text-muted small mb-0" style="font-size: 0.75rem;">
                    <i class="fa-solid fa-shield-halved"></i> Diagram disimpan secara aman ke database khusus untuk akun Anda.
                </p>
            </div>
            <div class="diagram-modal-footer">
                <button type="button" class="btn btn-outline" id="btnCancelSaveModal">Batal</button>
                <button type="button" class="btn btn-primary" id="btnSubmitSaveDiagram">
                    <i class="fa-solid fa-check"></i>
                    <span>Simpan Sekarang</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Modal Daftar Diagram Tersimpan -->
    <div class="diagram-modal-backdrop" id="modalListDiagram">
        <div class="diagram-modal-box">
            <div class="diagram-modal-header">
                <div class="diagram-modal-title">
                    <i class="fa-solid fa-folder-open"></i>
                    <span>Diagram Tersimpan Anda</span>
                </div>
                <button type="button" class="diagram-modal-close" id="btnCloseListModal" title="Tutup">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="diagram-modal-body" id="diagramListContainer" style="min-height: 180px;">
                <div class="text-center py-4 text-muted">
                    <i class="fa-solid fa-spinner fa-spin fa-2x mb-2" style="color: var(--btn-primary);"></i>
                    <p style="font-size: 0.85rem;">Memuat daftar diagram...</p>
                </div>
            </div>
            <div class="diagram-modal-footer">
                <button type="button" class="btn btn-outline" id="btnCloseListModalBtn">Tutup</button>
                <button type="button" class="btn btn-primary" id="btnNewDiagram">
                    <i class="fa-solid fa-plus"></i>
                    <span>Buat Diagram Baru</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Floating Toast Notification -->
    <div class="diagram-toast" id="diagramToast">
        <i class="fa-solid fa-circle-check" id="toastIcon"></i>
        <span id="toastMessage">Diagram berhasil disimpan!</span>
    </div>
</main>

<!-- Diagram Workspace Specific Scripts -->
<script src="<?= asset_url('js/diagram_parser.js') ?>"></script>
<script src="<?= asset_url('js/diagram_layout.js') ?>"></script>
<script src="<?= asset_url('js/diagram_router.js') ?>"></script>
<script src="<?= asset_url('js/diagram_canvas.js') ?>"></script>
<script src="<?= asset_url('js/diagram_export.js') ?>"></script>

<script>
document.addEventListener('DOMContentLoaded', () => {
    // Definisi Template Bawaan untuk Uji Coba Cepat
    const TEMPLATES = {
        ecommerce: `<?= addcslashes($default_code, "`\"\\") ?>`,
        auth: `classDiagram
    class User {
        +int id
        +string email
        +string passwordHash
        +bool isActive
        +verifyPassword()
        +changePassword()
    }

    class Role {
        +int id
        +string name
        +string description
        +hasPermission()
    }

    class Permission {
        +int id
        +string slug
        +string module
    }

    class UserSession {
        +string token
        +datetime expiresAt
        +string ipAddress
        +isValid()
    }

    User "1" --> "*" UserSession : owns
    User "*" --> "*" Role : assigned
    Role "*" --> "*" Permission : grants`,
        school: `classDiagram
    class Person {
        +string name
        +string identityNumber
        +string email
        +getDetails()
    }

    class Student {
        +string studentId
        +float gpa
        +enrollCourse()
    }

    class Teacher {
        +string employeeId
        +string faculty
        +assignGrade()
    }

    class Course {
        +string code
        +string title
        +int credits
        +getSyllabus()
    }

    Person <|-- Student : extends
    Person <|-- Teacher : extends
    Student "*" --> "*" Course : enrolls
    Teacher "1" --> "*" Course : teaches`,
        hospital: `classDiagram
    class Patient {
        +int id
        +string fullName
        +date dateOfBirth
        +string bloodType
        +getMedicalHistory()
    }

    class Doctor {
        +int id
        +string specialist
        +string licenseNumber
        +diagnose()
        +prescribe()
    }

    class Appointment {
        +int id
        +datetime scheduleTime
        +string status
        +reschedule()
        +cancel()
    }

    class MedicalRecord {
        +int id
        +string diagnosis
        +string treatment
        +printReport()
    }

    Patient "1" --> "*" Appointment : books
    Doctor "1" --> "*" Appointment : attends
    Appointment "1" --> "1" MedicalRecord : generates`,
        attendance: `classDiagram
    class Users {
        +int id
        +string nik
        +string username
        +string password
        +string name
        +int role_id
        +int is_admin
        +string photo_profile
        +string device_id
        +datetime created_at
        +login()
        +logout()
        +bindDevice()
    }

    class QrSessions {
        +int id
        +string token
        +date session_date
        +int is_active
        +datetime created_at
        +generateToken()
        +validateToken()
    }

    class LeaveTypes {
        +int id
        +string name
        +int max_days
        +int is_active
        +datetime created_at
    }

    class Roles {
        +int id
        +string name
        +decimal base_salary
        +decimal allowance
        +datetime created_at
    }

    class AttendanceLogs {
        +int id
        +int user_id
        +int session_id
        +datetime scan_time
        +int is_late
        +enum status
        +decimal pot_total_presensi
        +recordAttendance()
    }

    class LeaveRequests {
        +int id
        +int user_id
        +int leave_type_id
        +date start_date
        +date end_date
        +string reason
        +string attachment
        +int backup_user_id
        +enum status
        +string admin_note
        +datetime created_at
        +submitRequest()
        +approveRequest()
    }

    class PayrollHistory {
        +int id
        +int user_id
        +int month
        +int year
        +date payroll_date
        +decimal base_salary
        +decimal total_allowance
        +decimal pot_total_presensi
        +decimal pot_lain_lain
        +decimal thp
        +string status
        +datetime created_at
    }

    Users "1" --> "*" Roles : has_role
    Users "1" --> "*" AttendanceLogs : has
    Users "1" --> "*" LeaveRequests : submits
    Users "1" --> "*" LeaveRequests : backup_for
    QrSessions "1" --> "*" AttendanceLogs : used_in
    LeaveTypes "1" --> "*" LeaveRequests : type_of
    Users "1" --> "*" PayrollHistory : generates`
    };

    // Inisialisasi Elemen Kanvas
    const canvasArea = document.getElementById('diagramCanvasArea');
    const svgLayer = document.getElementById('diagramSvgLayer');
    const nodesLayer = document.getElementById('diagramNodesLayer');

    const codeInput = document.getElementById('mermaidCodeInput');
    const btnApply = document.getElementById('btnApplyCode');
    const btnToggleEditor = document.getElementById('btnToggleEditor');
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');
    const editorDrawer = document.getElementById('diagramEditorDrawer');
    const templateSelect = document.getElementById('templateSelect');

    const btnAutoFit = document.getElementById('btnAutoFit');
    const btnRelayout = document.getElementById('btnRelayout');
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnZoomReset = document.getElementById('btnZoomReset');
    const labelZoomPercent = document.getElementById('labelZoomPercent');
    const badgeNodeCount = document.getElementById('badgeNodeCount');
    const badgeRelCount = document.getElementById('badgeRelCount');
    const btnExportPng = document.getElementById('btnExportPng');
    const btnExportSvg = document.getElementById('btnExportSvg');

    let currentDiagramId = <?= json_encode($current_diagram_id) ?>;
    let currentDiagramTitle = <?= json_encode($current_diagram_title) ?>;
    let currentLayoutData = <?= json_encode($current_layout_data ? json_decode($current_layout_data, true) : null) ?>;

    // Buat Canvas Controller
    const canvas = DiagramCanvas.create(canvasArea, svgLayer, nodesLayer);

    // Callback pembaruan UI stats
    canvas.onUpdate((stats) => {
        labelZoomPercent.textContent = stats.zoom + '%';
        badgeNodeCount.textContent = stats.classCount + ' Kelas';
        badgeRelCount.textContent = stats.relationCount + ' Relasi';
    });

    // Fungsi Render dari Kode
    function compileAndRender(code, autoFit = true, customLayout = null) {
        const errorBanner = document.getElementById('parseErrorBanner');
        const errorMessage = document.getElementById('parseErrorMessage');

        function showError(msg) {
            if (errorMessage) errorMessage.textContent = msg;
            if (errorBanner) errorBanner.style.display = 'flex';
        }

        function hideError() {
            if (errorBanner) errorBanner.style.display = 'none';
        }

        try {
            const parsed = DiagramParser.parse(code);

            if (parsed.errors && parsed.errors.length > 0) {
                showError(parsed.errors.join('; '));
                return false;
            }

            if (!parsed.classes || parsed.classes.length === 0) {
                showError('Tidak ada kelas yang terdeteksi. Silakan periksa kembali format kode.');
                return false;
            }

            hideError();
            canvas.render(parsed.classes, parsed.relations, autoFit, customLayout);
            return true;
        } catch (err) {
            console.error('Diagram Compile Error:', err);
            showError('Terjadi kesalahan saat memproses diagram: ' + err.message);
            return false;
        }
    }

    // Render awal saat halaman dimuat (terapkan posisi tersimpan jika ada)
    compileAndRender(codeInput.value, currentLayoutData ? false : true, currentLayoutData);

    // Event Listener Terapkan Kode
    btnApply.addEventListener('click', () => {
        const success = compileAndRender(codeInput.value, true);
        if (success) {
            const origHtml = btnApply.innerHTML;
            btnApply.innerHTML = '<i class="fa-solid fa-check"></i> <span>Berhasil Diterapkan!</span>';
            btnApply.style.backgroundColor = '#10b981';
            btnApply.style.borderColor = '#10b981';

            setTimeout(() => {
                btnApply.innerHTML = origHtml;
                btnApply.style.backgroundColor = '';
                btnApply.style.borderColor = '';
            }, 1200);

            // Pada layar mobile/tablet, sembunyikan drawer agar pengguna langsung melihat hasil diagram
            if (window.innerWidth <= 992) {
                toggleEditor(false);
            }
        }
    });

    // Shortcut Ctrl+Enter atau Cmd+Enter untuk compile instan
    codeInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            btnApply.click();
        }
    });

    // Ganti Template
    templateSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (TEMPLATES[val]) {
            codeInput.value = TEMPLATES[val];
            compileAndRender(codeInput.value, true);
        }
    });

    // Toggle Drawer Editor
    function toggleEditor(forceState) {
        const isMobile = window.innerWidth <= 992;
        if (isMobile) {
            const willOpen = (typeof forceState === 'boolean') ? forceState : !editorDrawer.classList.contains('is-open');
            editorDrawer.classList.toggle('is-open', willOpen);
            btnToggleEditor.classList.toggle('active', willOpen);
        } else {
            const willClose = (typeof forceState === 'boolean') ? !forceState : !editorDrawer.classList.contains('is-closed');
            editorDrawer.classList.toggle('is-closed', willClose);
            btnToggleEditor.classList.toggle('active', !willClose);
            setTimeout(() => {
                canvas.autoFit();
            }, 260);
        }
    }

    // Tombol editor aktif secara default di desktop
    if (window.innerWidth > 992) {
        btnToggleEditor.classList.add('active');
    }

    btnToggleEditor.addEventListener('click', () => toggleEditor());
    btnCloseDrawer.addEventListener('click', () => toggleEditor(false));

    // Kontrol Navigasi Kanvas
    btnAutoFit.addEventListener('click', () => canvas.autoFit());
    btnRelayout.addEventListener('click', () => canvas.relayout());
    btnZoomIn.addEventListener('click', () => canvas.zoomIn());
    btnZoomOut.addEventListener('click', () => canvas.zoomOut());
    btnZoomReset.addEventListener('click', () => canvas.resetZoom());

    // Export PNG
    btnExportPng.addEventListener('click', async () => {
        const originalContent = btnExportPng.innerHTML;
        btnExportPng.disabled = true;
        btnExportPng.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span class="btn-text">Mengekspor...</span>';

        try {
            const fileName = 'greyagram-' + (templateSelect.value || 'diagram') + '-' + Date.now() + '.png';
            await DiagramExport.downloadPNG(canvas.getState(), fileName);
        } catch (err) {
            alert('Gagal mengekspor diagram: ' + err.message);
        } finally {
            btnExportPng.disabled = false;
            btnExportPng.innerHTML = originalContent;
        }
    });

    // Export SVG (Vector HD - Resolusi Tak Terbatas)
    if (btnExportSvg) {
        btnExportSvg.addEventListener('click', () => {
            try {
                const fileName = 'greyagram-' + (templateSelect.value || 'diagram') + '-' + Date.now() + '.svg';
                DiagramExport.downloadSVG(canvas.getState(), fileName);
            } catch (err) {
                alert('Gagal mengekspor SVG: ' + err.message);
            }
        });
    }

    // Tangani Resize Window agar Kanvas tetap rapi
    window.addEventListener('resize', () => {
        canvas.updateConnectors();
    });

    // ==========================================
    // LOGIKA PENYIMPANAN DATABASE (PER USER)
    // ==========================================
    const btnSaveDiagram = document.getElementById('btnSaveDiagram');
    const btnOpenDiagrams = document.getElementById('btnOpenDiagrams');
    const displayDiagramTitle = document.getElementById('displayDiagramTitle');

    const saveStatusBadge = document.getElementById('saveStatusBadge');
    const saveStatusText = document.getElementById('saveStatusText');
    const saveStatusIcon = document.getElementById('saveStatusIcon');
    let autoSaveTimer = null;

    function updateSaveStatus(status, text) {
        if (!saveStatusBadge) return;
        saveStatusBadge.style.display = 'inline-flex';
        saveStatusBadge.className = 'save-status-badge ' + status;
        if (saveStatusText) saveStatusText.textContent = text;
        if (saveStatusIcon) {
            if (status === 'saving') saveStatusIcon.className = 'fa-solid fa-spinner fa-spin';
            else if (status === 'saved') saveStatusIcon.className = 'fa-solid fa-circle-check text-success';
            else saveStatusIcon.className = 'fa-solid fa-cloud';
        }
    }

    if (currentDiagramId) {
        updateSaveStatus('saved', 'Tersimpan');
    }

    // Tangkap perubahan posisi kartu (drag & drop) untuk auto-save posisi ke database
    canvas.onPositionChange((layoutData) => {
        if (currentDiagramId) {
            updateSaveStatus('saving', 'Menyimpan posisi...');
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(async () => {
                try {
                    const thumbData = DiagramExport.generateThumbnail(canvas.getState());
                    const response = await fetch('<?= base_url('diagram/save_positions') ?>', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({
                            id: currentDiagramId,
                            layout_data: layoutData,
                            thumbnail: thumbData
                        })
                    });
                    const res = await response.json();
                    if (res.success) {
                        updateSaveStatus('saved', 'Posisi tersimpan');
                    } else {
                        updateSaveStatus('unsaved', 'Perubahan belum disimpan');
                    }
                } catch (e) {
                    updateSaveStatus('unsaved', 'Perubahan belum disimpan');
                }
            }, 800);
        } else {
            updateSaveStatus('unsaved', 'Posisi diubah (Belum disimpan)');
        }
    });

    const modalSave = document.getElementById('modalSaveDiagram');
    const btnCloseSaveModal = document.getElementById('btnCloseSaveModal');
    const btnCancelSaveModal = document.getElementById('btnCancelSaveModal');
    const btnSubmitSaveDiagram = document.getElementById('btnSubmitSaveDiagram');
    const inputSaveTitle = document.getElementById('inputSaveTitle');
    const inputSaveDesc = document.getElementById('inputSaveDesc');

    const modalList = document.getElementById('modalListDiagram');
    const btnCloseListModal = document.getElementById('btnCloseListModal');
    const btnCloseListModalBtn = document.getElementById('btnCloseListModalBtn');
    const btnNewDiagram = document.getElementById('btnNewDiagram');
    const diagramListContainer = document.getElementById('diagramListContainer');

    const diagramToast = document.getElementById('diagramToast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');

    let toastTimer = null;

    function showToast(msg, isError = false) {
        if (toastTimer) clearTimeout(toastTimer);
        toastMessage.textContent = msg;
        if (isError) {
            diagramToast.classList.add('toast-error');
            toastIcon.className = 'fa-solid fa-circle-exclamation';
        } else {
            diagramToast.classList.remove('toast-error');
            toastIcon.className = 'fa-solid fa-circle-check';
        }

        diagramToast.classList.add('is-show');
        toastTimer = setTimeout(() => {
            diagramToast.classList.remove('is-show');
        }, 3200);
    }

    function openModal(modalEl) {
        if (modalEl) modalEl.classList.add('is-open');
    }

    function closeModal(modalEl) {
        if (modalEl) modalEl.classList.remove('is-open');
    }

    // Tutup modal jika klik di luar kotak modal
    [modalSave, modalList].forEach(m => {
        if (m) {
            m.addEventListener('click', (e) => {
                if (e.target === m) closeModal(m);
            });
        }
    });

    if (btnCloseSaveModal) btnCloseSaveModal.addEventListener('click', () => closeModal(modalSave));
    if (btnCancelSaveModal) btnCancelSaveModal.addEventListener('click', () => closeModal(modalSave));
    if (btnCloseListModal) btnCloseListModal.addEventListener('click', () => closeModal(modalList));
    if (btnCloseListModalBtn) btnCloseListModalBtn.addEventListener('click', () => closeModal(modalList));

    // Buka Modal Simpan
    if (btnSaveDiagram) {
        btnSaveDiagram.addEventListener('click', () => {
            if (inputSaveTitle) {
                inputSaveTitle.value = currentDiagramTitle || 'Diagram Tanpa Judul';
            }
            openModal(modalSave);
            setTimeout(() => { if (inputSaveTitle) inputSaveTitle.focus(); }, 150);
        });
    }

    // Submit Simpan Diagram ke Database
    if (btnSubmitSaveDiagram) {
        btnSubmitSaveDiagram.addEventListener('click', async () => {
            const title = inputSaveTitle.value.trim() || 'Diagram Tanpa Judul';
            const desc = inputSaveDesc ? inputSaveDesc.value.trim() : '';
            const code = codeInput.value;

            if (!code || code.trim() === '') {
                showToast('Kode diagram tidak boleh kosong.', true);
                return;
            }

            const origContent = btnSubmitSaveDiagram.innerHTML;
            btnSubmitSaveDiagram.disabled = true;
            btnSubmitSaveDiagram.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

            try {
                // Tangkap layout posisi kartu dan pratinjau thumbnail
                const layoutData = canvas.getLayoutData();
                const thumbData = DiagramExport.generateThumbnail(canvas.getState());

                const response = await fetch('<?= base_url('diagram/save') ?>', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({
                        id: currentDiagramId,
                        title: title,
                        description: desc,
                        code: code,
                        layout_data: layoutData,
                        thumbnail: thumbData
                    })
                });

                const res = await response.json();

                if (res.success) {
                    currentDiagramId = res.id;
                    currentDiagramTitle = res.title;
                    currentLayoutData = layoutData;
                    if (displayDiagramTitle) displayDiagramTitle.textContent = res.title;

                    updateSaveStatus('saved', 'Tersimpan');

                    // Update URL browser tanpa reload halaman
                    const newUrl = '<?= base_url('diagram') ?>?id=' + res.id;
                    window.history.pushState({ diagramId: res.id }, res.title, newUrl);

                    closeModal(modalSave);
                    showToast(res.message || 'Diagram berhasil disimpan ke database!');
                } else {
                    showToast(res.message || 'Gagal menyimpan diagram.', true);
                }
            } catch (err) {
                showToast('Terjadi kesalahan jaringan: ' + err.message, true);
            } finally {
                btnSubmitSaveDiagram.disabled = false;
                btnSubmitSaveDiagram.innerHTML = origContent;
            }
        });
    }

    // Buka Modal Daftar Diagram
    if (btnOpenDiagrams) {
        btnOpenDiagrams.addEventListener('click', () => {
            openModal(modalList);
            loadDiagramList();
        });
    }

    // Ambil Daftar Diagram dari Database
    async function loadDiagramList() {
        if (!diagramListContainer) return;
        diagramListContainer.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fa-solid fa-spinner fa-spin fa-2x mb-2" style="color: var(--btn-primary);"></i>
                <p style="font-size: 0.85rem;">Memuat daftar diagram...</p>
            </div>
        `;

        try {
            const response = await fetch('<?= base_url('diagram/list') ?>', {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const res = await response.json();

            if (res.success && res.data && res.data.length > 0) {
                let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
                res.data.forEach(item => {
                    const isCurrent = (currentDiagramId && parseInt(item.id) === parseInt(currentDiagramId));
                    const activeBadge = isCurrent ? '<span class="badge" style="background-color: #e0e7ff; color: #4338ca; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Sedang Aktif</span>' : '';
                    
                    html += `
                        <div class="diagram-item-card" style="${isCurrent ? 'border-color: #4a80f0; background-color: #f8faff;' : ''}">
                            <div class="diagram-item-info">
                                <div class="diagram-item-title">
                                    <i class="fa-solid fa-file-code" style="color: var(--btn-primary); margin-right: 4px;"></i>
                                    <span>${escapeHtml(item.title)}</span>
                                    ${activeBadge}
                                </div>
                                <div class="diagram-item-meta">
                                    <span>Diperbarui: ${escapeHtml(item.updated_at || item.created_at)}</span>
                                    ${item.description ? ` &bull; <span>${escapeHtml(item.description)}</span>` : ''}
                                </div>
                            </div>
                            <div class="diagram-item-actions">
                                <button type="button" class="btn btn-sm btn-outline btn-load-diagram" data-id="${item.id}" title="Muat Diagram Ini">
                                    <i class="fa-solid fa-folder-open"></i> Buka
                                </button>
                                <button type="button" class="btn btn-sm btn-icon btn-delete-diagram" data-id="${item.id}" title="Hapus Diagram Ini" style="color: #ef4444; border-color: #fecaca;">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                diagramListContainer.innerHTML = html;

                // Pasang event listener tombol Buka
                diagramListContainer.querySelectorAll('.btn-load-diagram').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.getAttribute('data-id');
                        loadSingleDiagram(id);
                    });
                });

                // Pasang event listener tombol Hapus
                diagramListContainer.querySelectorAll('.btn-delete-diagram').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.getAttribute('data-id');
                        deleteDiagram(id);
                    });
                });
            } else {
                diagramListContainer.innerHTML = `
                    <div class="text-center py-4" style="color: #6b7280;">
                        <i class="fa-solid fa-box-open fa-2x mb-2" style="opacity: 0.5;"></i>
                        <p style="font-size: 0.9rem; margin-bottom: 0.25rem;">Belum ada diagram yang tersimpan di akun Anda.</p>
                        <p style="font-size: 0.8rem; color: #9ca3af;">Gunakan tombol "Simpan" di toolbar untuk menyimpan diagram saat ini.</p>
                    </div>
                `;
            }
        } catch (err) {
            diagramListContainer.innerHTML = `
                <div class="text-center py-4 text-danger">
                    <i class="fa-solid fa-circle-exclamation fa-2x mb-2"></i>
                    <p style="font-size: 0.85rem;">Gagal memuat daftar diagram: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    // Muat satu diagram tertentu ke kanvas dan editor
    async function loadSingleDiagram(id) {
        try {
            const response = await fetch('<?= base_url('diagram/load') ?>?id=' + id, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const res = await response.json();

            if (res.success && res.diagram) {
                currentDiagramId = res.diagram.id;
                currentDiagramTitle = res.diagram.title;
                if (displayDiagramTitle) displayDiagramTitle.textContent = res.diagram.title;

                codeInput.value = res.diagram.code;

                let loadedLayout = null;
                if (res.diagram.layout_data) {
                    try {
                        loadedLayout = (typeof res.diagram.layout_data === 'string') 
                            ? JSON.parse(res.diagram.layout_data) 
                            : res.diagram.layout_data;
                    } catch(e) {}
                }
                currentLayoutData = loadedLayout;
                compileAndRender(res.diagram.code, loadedLayout ? false : true, loadedLayout);
                updateSaveStatus('saved', 'Tersimpan');

                const newUrl = '<?= base_url('diagram') ?>?id=' + res.diagram.id;
                window.history.pushState({ diagramId: res.diagram.id }, res.diagram.title, newUrl);

                closeModal(modalList);
                showToast(`Diagram "${res.diagram.title}" berhasil dimuat!`);
            } else {
                showToast(res.message || 'Gagal memuat diagram.', true);
            }
        } catch (err) {
            showToast('Gagal memuat diagram: ' + err.message, true);
        }
    }

    // Hapus diagram dari database
    async function deleteDiagram(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus diagram ini dari database?')) {
            return;
        }

        try {
            const response = await fetch('<?= base_url('diagram/delete') ?>', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ id: id })
            });
            const res = await response.json();

            if (res.success) {
                showToast(res.message || 'Diagram berhasil dihapus.');
                if (currentDiagramId && parseInt(currentDiagramId) === parseInt(id)) {
                    currentDiagramId = null;
                    currentDiagramTitle = 'Diagram Tanpa Judul';
                    currentLayoutData = null;
                    if (displayDiagramTitle) displayDiagramTitle.textContent = currentDiagramTitle;
                    window.history.pushState({}, '', '<?= base_url('diagram') ?>');
                }
                loadDiagramList();
            } else {
                showToast(res.message || 'Gagal menghapus diagram.', true);
            }
        } catch (err) {
            showToast('Gagal menghapus diagram: ' + err.message, true);
        }
    }

    // Tombol Buat Diagram Baru
    if (btnNewDiagram) {
        btnNewDiagram.addEventListener('click', () => {
            currentDiagramId = null;
            currentDiagramTitle = 'Diagram Tanpa Judul';
            currentLayoutData = null;
            if (displayDiagramTitle) displayDiagramTitle.textContent = currentDiagramTitle;
            window.history.pushState({}, '', '<?= base_url('diagram') ?>');

            if (saveStatusBadge) saveStatusBadge.style.display = 'none';

            // Set ke template e-commerce default
            if (TEMPLATES.ecommerce) {
                codeInput.value = TEMPLATES.ecommerce;
                compileAndRender(codeInput.value, true, null);
            }

            closeModal(modalList);
            showToast('Membuat diagram baru.');
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
</script>

<?php
require_once __DIR__ . '/../layouts/footer.php';
?>

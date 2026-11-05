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
            <div class="toolbar-divider"></div>
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
        </div>

        <div class="toolbar-center">
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

    // Buat Canvas Controller
    const canvas = DiagramCanvas.create(canvasArea, svgLayer, nodesLayer);

    // Callback pembaruan UI stats
    canvas.onUpdate((stats) => {
        labelZoomPercent.textContent = stats.zoom + '%';
        badgeNodeCount.textContent = stats.classCount + ' Kelas';
        badgeRelCount.textContent = stats.relationCount + ' Relasi';
    });

    // Fungsi Render dari Kode
    function compileAndRender(code, autoFit = true) {
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
            canvas.render(parsed.classes, parsed.relations, autoFit);
            return true;
        } catch (err) {
            console.error('Diagram Compile Error:', err);
            showError('Terjadi kesalahan saat memproses diagram: ' + err.message);
            return false;
        }
    }

    // Render awal saat halaman dimuat
    compileAndRender(codeInput.value, true);

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
});
</script>

<?php
require_once __DIR__ . '/../layouts/footer.php';
?>

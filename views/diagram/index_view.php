<?php
$page_title = 'Diagram Workspace';
$hide_footer = true;
require_once __DIR__ . '/../layouts/header.php';
// Dedicated Full-Screen Canvas Workspace (Sidebar omitted for maximum working area)
?>

<main class="main-content diagram-main-layout">
    <!-- Top Workspace Toolbar -->
    <header class="diagram-toolbar">
        <div class="toolbar-left">
            <!-- Brand / Back Button to Projects Gallery -->
            <a href="<?= base_url('projects') ?>" class="btn-workspace-brand" title="Kembali ke Galeri Seluruh Proyek">
                <i class="fa-solid fa-arrow-left"></i>
                <span class="brand-text">Greyagram</span>
            </a>

            <button type="button" class="btn btn-outline toolbar-btn active" id="btnTogglePalette" title="Buka / Tutup Palet Komponen Kelas">
                <i class="fa-solid fa-shapes"></i>
                <span class="btn-text">Komponen</span>
            </button>

            <button type="button" class="btn btn-outline toolbar-btn active" id="btnToggleEditor" title="Buka / Tutup Editor Kode Mermaid">
                <i class="fa-solid fa-code"></i>
                <span class="btn-text">Kode</span>
            </button>

            <div class="template-selector-wrap">
                <label for="templateSelect" class="sr-only">Pilih Template</label>
                <select id="templateSelect" class="form-control form-control-sm template-select">
                    <option value="ecommerce">E-Commerce</option>
                    <option value="attendance">HR & Presensi</option>
                    <option value="auth">User & Auth</option>
                    <option value="school">Akademik</option>
                    <option value="hospital">Kesehatan</option>
                </select>
            </div>

            <div class="toolbar-divider"></div>

            <a href="<?= base_url('projects') ?>" class="btn btn-outline toolbar-btn" title="Buka Galeri Seluruh Proyek">
                <i class="fa-solid fa-layer-group"></i>
                <span class="btn-text">Proyek</span>
            </a>

            <button type="button" class="btn btn-outline toolbar-btn" id="btnOpenDiagrams" title="Buka Diagram Tersimpan">
                <i class="fa-solid fa-folder-open"></i>
                <span class="btn-text">Buka</span>
            </button>

            <button type="button" class="btn btn-outline toolbar-btn" id="btnSaveDiagram" title="Simpan Diagram ke Database">
                <i class="fa-solid fa-floppy-disk"></i>
                <span class="btn-text">Simpan</span>
            </button>
        </div>

        <div class="toolbar-center">
            <div class="diagram-active-title" id="diagramActiveTitle" title="Diagram Aktif">
                <i class="fa-solid fa-diagram-project"></i>
                <span id="displayDiagramTitle"><?= htmlspecialchars($current_diagram_title, ENT_QUOTES, 'UTF-8') ?></span>
            </div>

            <!-- Fitur Lock Position: Kunci posisi kartu agar tidak bergeser tidak sengaja -->
            <button type="button" class="btn btn-outline toolbar-btn lock-btn" id="btnToggleLock" title="Kunci / Buka Posisi Kartu pada Kanvas">
                <i class="fa-solid fa-lock-open" id="iconLock"></i>
                <span id="labelLock">Bebas</span>
            </button>

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
                <span class="btn-text">Fit</span>
            </button>

            <div class="dropdown-auto-arrange-wrap" id="wrapAutoArrange">
                <button type="button" class="btn btn-outline toolbar-btn" id="btnRelayout" title="Pilih Algoritma Tata Letak Otomatis (Rapikan)">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <span class="btn-text">Rapikan</span>
                    <i class="fa-solid fa-chevron-down caret-mini"></i>
                </button>

                <!-- Popover Algoritma Tata Letak dbdiagram.io -->
                <div class="auto-arrange-popover" id="popoverAutoArrange" style="display: none;">
                    <div class="popover-header">
                        <span>Choose auto arrange algorithm</span>
                        <button type="button" class="btn-close-popover" id="btnCloseArrangePopover" title="Tutup">&times;</button>
                    </div>
                    <div class="popover-body">
                        <!-- 1. Left-right -->
                        <div class="arrange-option" data-algo="left-right" tabindex="0">
                            <div class="arrange-icon">
                                <i class="fa-solid fa-diagram-next"></i>
                            </div>
                            <div class="arrange-content">
                                <div class="arrange-title">Left-right</div>
                                <div class="arrange-desc">Arrange tables left to right following their foreign-key relationships. Best for schemas with long relationship chains.</div>
                            </div>
                            <div class="arrange-badge">1</div>
                        </div>

                        <!-- 2. Pipeline -->
                        <div class="arrange-option" data-algo="pipeline" tabindex="0">
                            <div class="arrange-icon">
                                <i class="fa-solid fa-link"></i>
                            </div>
                            <div class="arrange-content">
                                <div class="arrange-title">Pipeline</div>
                                <div class="arrange-desc">Arrange tables left to right along their data-dependency lineage. Table groups become stages ordered left to right, with their tables stacked vertically.</div>
                            </div>
                            <div class="arrange-badge">2</div>
                        </div>

                        <!-- 3. Snowflake -->
                        <div class="arrange-option" data-algo="snowflake" tabindex="0">
                            <div class="arrange-icon">
                                <i class="fa-solid fa-snowflake"></i>
                            </div>
                            <div class="arrange-content">
                                <div class="arrange-title">Snowflake</div>
                                <div class="arrange-desc">Arrange tables in a snowflake shape, with the most connected tables in the center. Ideal for densely connected diagrams like data warehouses.</div>
                            </div>
                            <div class="arrange-badge">3</div>
                        </div>

                        <!-- 4. Compact (Default) -->
                        <div class="arrange-option active" data-algo="compact" tabindex="0">
                            <div class="arrange-icon">
                                <i class="fa-solid fa-table-cells-large"></i>
                            </div>
                            <div class="arrange-content">
                                <div class="arrange-title">Compact</div>
                                <div class="arrange-desc">Arrange tables in a compact rectangle layout. Ideal for diagrams with few relationships and tables.</div>
                            </div>
                            <div class="arrange-badge">4</div>
                        </div>
                    </div>
                </div>
            </div>

            <button type="button" class="btn btn-outline toolbar-btn" id="btnExportSvg" title="Unduh Diagram sebagai Berkas Vektor SVG">
                <i class="fa-solid fa-bezier-curve"></i>
                <span class="btn-text">SVG</span>
            </button>

            <button type="button" class="btn btn-primary toolbar-btn" id="btnExportPng" title="Unduh Diagram sebagai Citra PNG Ultra-HD">
                <i class="fa-solid fa-download"></i>
                <span class="btn-text">PNG</span>
            </button>
        </div>
    </header>

    <!-- Workspace Area (Left Palette Drawer + Center Canvas + Right Editor Drawer) -->
    <div class="diagram-workspace-container">
        <!-- 1. LEFT: Palet Komponen Kelas (Preview Visual Mini-Card, Drag & Drop, Expandable with Angle Toggle) -->
        <aside class="diagram-palette-drawer" id="diagramPaletteDrawer">
            <div class="drawer-resizer resizer-right" id="paletteResizer" title="Tarik untuk mengubah lebar palet komponen"></div>

            <div class="palette-drawer-header">
                <div class="palette-title">
                    <i class="fa-solid fa-shapes"></i>
                    <span>Komponen Kelas</span>
                </div>
                <button type="button" class="drawer-angle-btn" id="btnCollapsePalette" title="Sembunyikan Palet (Angle Left)">
                    <i class="fa-solid fa-angle-left"></i>
                </button>
            </div>

            <div class="palette-drawer-body">
                <p class="palette-hint">Tarik kartu preview langsung ke lembar kerja.</p>

                <!-- 1. Mini Card Preview: Class Standar -->
                <div class="palette-preview-card" draggable="true" data-type="class" title="Tarik ke kanvas untuk menambah Class standar">
                    <div class="mini-card-header header-class">
                        <span class="mini-card-icon"><i class="fa-solid fa-cube"></i></span>
                        <span class="mini-card-title">User</span>
                    </div>
                    <div class="mini-card-section">
                        <div class="mini-card-line"><span class="mini-vis text-public">+</span> <span class="mini-field">id</span>: <span class="mini-type">int</span></div>
                        <div class="mini-card-line"><span class="mini-vis text-public">+</span> <span class="mini-field">name</span>: <span class="mini-type">string</span></div>
                    </div>
                    <div class="mini-card-section mini-methods">
                        <div class="mini-card-line"><span class="mini-vis text-public">+</span> <span class="mini-method">login()</span></div>
                    </div>
                    <div class="mini-card-drag-hint">
                        <i class="fa-solid fa-hand-pointer"></i> Drag ke Kanvas
                    </div>
                </div>

                <!-- 2. Mini Card Preview: <<interface>> -->
                <div class="palette-preview-card" draggable="true" data-type="interface" title="Tarik ke kanvas untuk menambah Interface">
                    <div class="mini-card-header header-interface">
                        <span class="mini-card-stereotype">&lt;&lt;interface&gt;&gt;</span>
                        <div class="mini-card-title-row">
                            <span class="mini-card-icon"><i class="fa-solid fa-circle-nodes"></i></span>
                            <span class="mini-card-title">IAuthService</span>
                        </div>
                    </div>
                    <div class="mini-card-section mini-methods">
                        <div class="mini-card-line"><span class="mini-vis text-public">+</span> <span class="mini-method">authenticate()</span></div>
                        <div class="mini-card-line"><span class="mini-vis text-public">+</span> <span class="mini-method">validateToken()</span></div>
                    </div>
                    <div class="mini-card-drag-hint">
                        <i class="fa-solid fa-hand-pointer"></i> Drag ke Kanvas
                    </div>
                </div>

                <!-- 3. Mini Card Preview: <<abstract>> -->
                <div class="palette-preview-card" draggable="true" data-type="abstract" title="Tarik ke kanvas untuk menambah Abstract Class">
                    <div class="mini-card-header header-abstract">
                        <span class="mini-card-stereotype">&lt;&lt;abstract&gt;&gt;</span>
                        <div class="mini-card-title-row">
                            <span class="mini-card-icon"><i class="fa-solid fa-diagram-nested"></i></span>
                            <span class="mini-card-title">BaseEntity</span>
                        </div>
                    </div>
                    <div class="mini-card-section">
                        <div class="mini-card-line"><span class="mini-vis text-protected">#</span> <span class="mini-field">id</span>: <span class="mini-type">int</span></div>
                        <div class="mini-card-line"><span class="mini-vis text-protected">#</span> <span class="mini-field">created_at</span></div>
                    </div>
                    <div class="mini-card-section mini-methods">
                        <div class="mini-card-line"><span class="mini-vis text-public">+</span> <span class="mini-method">save()*</span></div>
                    </div>
                    <div class="mini-card-drag-hint">
                        <i class="fa-solid fa-hand-pointer"></i> Drag ke Kanvas
                    </div>
                </div>

                <!-- 4. Mini Card Preview: <<enum>> -->
                <div class="palette-preview-card" draggable="true" data-type="enum" title="Tarik ke kanvas untuk menambah Enum">
                    <div class="mini-card-header header-enum">
                        <span class="mini-card-stereotype">&lt;&lt;enum&gt;&gt;</span>
                        <div class="mini-card-title-row">
                            <span class="mini-card-icon"><i class="fa-solid fa-list-check"></i></span>
                            <span class="mini-card-title">UserStatus</span>
                        </div>
                    </div>
                    <div class="mini-card-section">
                        <div class="mini-card-line enum-line"><span class="mini-bullet">&bull;</span> ACTIVE</div>
                        <div class="mini-card-line enum-line"><span class="mini-bullet">&bull;</span> INACTIVE</div>
                        <div class="mini-card-line enum-line"><span class="mini-bullet">&bull;</span> PENDING</div>
                    </div>
                    <div class="mini-card-drag-hint">
                        <i class="fa-solid fa-hand-pointer"></i> Drag ke Kanvas
                    </div>
                </div>
            </div>

            <div class="palette-drawer-footer">
                <div class="palette-tip">
                    <i class="fa-solid fa-lightbulb"></i>
                    <span>Tarik kartu ke kanvas atau klik untuk menambahkan di tengah layar.</span>
                </div>
            </div>
        </aside>

        <!-- 2. CENTER: Canvas Viewport -->
        <section class="diagram-canvas-area" id="diagramCanvasArea">
            <!-- Dock Tabs dengan Angle Icon untuk Membuka Kembali Panel yang Di-collapse -->
            <button type="button" class="drawer-dock-tab dock-tab-left" id="btnDockOpenPalette" style="display: none;" title="Buka Palet Komponen (Angle)">
                <i class="fa-solid fa-angle-right"></i>
            </button>
            <button type="button" class="drawer-dock-tab dock-tab-right" id="btnDockOpenEditor" style="display: none;" title="Buka Editor Kode (Angle)">
                <i class="fa-solid fa-angle-left"></i>
            </button>

            <div class="canvas-background"></div>

            <div class="diagram-viewport" id="diagramViewport">
                <!-- SVG Layer untuk Garis Relasi dan Panah -->
                <svg id="diagramSvgLayer" class="diagram-svg-layer" xmlns="http://www.w3.org/2000/svg">
                    <defs></defs>
                </svg>

                <!-- HTML Layer untuk Kartu Kelas yang Draggable -->
                <div id="diagramNodesLayer" class="diagram-nodes-layer"></div>
            </div>

            <!-- Floating Quick Bar (dbdiagram style di pojok kiri bawah kanvas) -->
            <div class="canvas-bottom-floating-bar" id="canvasBottomBar">
                <button type="button" class="btn-float-action" id="btnFloatArrange" title="Choose auto arrange algorithm (1-4)">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <span class="float-action-badge" id="badgeCurrentAlgo">4</span>
                </button>
                <div class="float-bar-sep"></div>
                <button type="button" class="btn-float-action" id="btnFloatFit" title="Fit to screen">
                    <i class="fa-solid fa-expand"></i>
                </button>
            </div>

            <!-- Canvas Floating Instructions / Help -->
            <div class="canvas-floating-hint">
                <i class="fa-solid fa-arrows-up-down-left-right"></i>
                <span>Tarik latar untuk Pan &bull; Drag header kartu untuk geser &bull; Scroll untuk Zoom</span>
            </div>
        </section>

        <!-- 3. RIGHT: Editor Kode Mermaid (Expandable with Minimum Width, Angle Toggle, Default Show) -->
        <aside class="diagram-editor-drawer" id="diagramEditorDrawer">
            <div class="drawer-resizer resizer-left" id="editorResizer" title="Tarik untuk mengubah lebar editor kode"></div>

            <div class="editor-drawer-header">
                <button type="button" class="drawer-angle-btn" id="btnCloseDrawer" title="Sembunyikan Editor Kode (Angle Right)">
                    <i class="fa-solid fa-angle-right"></i>
                </button>
                <div class="drawer-title">
                    <i class="fa-solid fa-terminal"></i>
                    <span>Sintaks Mermaid (Class)</span>
                </div>
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

    // Render awal saat halaman dimuat: SELALU fit to screen saat project pertama kali dibuka
    compileAndRender(codeInput.value, true, currentLayoutData);

    // Jalankan autoFit kembali setelah DOM dan font selesai diproses agar benar-benar presisi
    requestAnimationFrame(() => {
        setTimeout(() => {
            canvas.autoFit();
        }, 120);
    });

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
            compileAndRender(codeInput.value, true, null);
        }
    });

    // ==========================================
    // 1. PALET KOMPONEN KELAS (LEFT DRAWER)
    // ==========================================
    const paletteDrawer = document.getElementById('diagramPaletteDrawer');
    const btnTogglePalette = document.getElementById('btnTogglePalette');
    const btnCollapsePalette = document.getElementById('btnCollapsePalette');
    const btnDockOpenPalette = document.getElementById('btnDockOpenPalette');
    const paletteResizer = document.getElementById('paletteResizer');

    function setPaletteState(isOpen) {
        if (!paletteDrawer) return;
        paletteDrawer.classList.toggle('is-collapsed', !isOpen);
        if (btnTogglePalette) btnTogglePalette.classList.toggle('active', isOpen);
        if (btnDockOpenPalette) btnDockOpenPalette.style.display = isOpen ? 'none' : 'flex';
        setTimeout(() => {
            if (canvas && typeof canvas.updateConnectors === 'function') {
                canvas.updateConnectors();
            }
        }, 260);
    }

    if (btnTogglePalette) btnTogglePalette.addEventListener('click', () => {
        setPaletteState(paletteDrawer.classList.contains('is-collapsed'));
    });
    if (btnCollapsePalette) btnCollapsePalette.addEventListener('click', () => setPaletteState(false));
    if (btnDockOpenPalette) btnDockOpenPalette.addEventListener('click', () => setPaletteState(true));

    // Resizer Horizontal Palet Komponen (Min-Width 200px, Max-Width 450px)
    let isResizingPalette = false;
    if (paletteResizer && paletteDrawer) {
        paletteResizer.addEventListener('mousedown', (e) => {
            isResizingPalette = true;
            paletteResizer.classList.add('is-resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const startX = e.clientX;
            const startW = paletteDrawer.offsetWidth;

            function onMouseMove(moveEvent) {
                if (!isResizingPalette) return;
                const newW = Math.max(200, Math.min(450, startW + (moveEvent.clientX - startX)));
                paletteDrawer.style.width = newW + 'px';
                paletteDrawer.style.minWidth = newW + 'px';
                if (canvas && typeof canvas.updateConnectors === 'function') {
                    canvas.updateConnectors();
                }
            }

            function onMouseUp() {
                isResizingPalette = false;
                paletteResizer.classList.remove('is-resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                if (canvas && typeof canvas.updateConnectors === 'function') {
                    canvas.updateConnectors();
                }
            }

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

    // Drag-and-drop & Klik dari Mini-Card Preview
    document.querySelectorAll('.palette-preview-card').forEach(card => {
        const type = card.getAttribute('data-type') || 'class';

        // Klik kartu untuk instan menambah di tengah kanvas
        card.addEventListener('click', () => {
            canvas.addClass(type);
            showToast(`Kelas ${type} berhasil ditambahkan.`);
        });

        // Drag start: simpan tipe kelas
        card.addEventListener('dragstart', (e) => {
            card.classList.add('is-dragging');
            e.dataTransfer.setData('text/plain', type);
            e.dataTransfer.effectAllowed = 'copy';
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('is-dragging');
        });
    });

    // Drop target pada area kanvas
    if (canvasArea) {
        canvasArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        canvasArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('text/plain');
            if (!type) return;

            const rect = canvasArea.getBoundingClientRect();
            const state = canvas.getState();
            const dropX = Math.round((e.clientX - rect.left - state.panX) / state.zoom - 130);
            const dropY = Math.round((e.clientY - rect.top - state.panY) / state.zoom - 80);

            canvas.addClass(type, null, dropX, dropY);
            showToast(`Kelas ${type} berhasil ditambahkan di posisi kursor.`);
        });
    }

    // ==========================================
    // 2. EDITOR KODE MERMAID (RIGHT DRAWER)
    // ==========================================
    // Catatan: editorDrawer, btnToggleEditor, btnCloseDrawer sudah diinisialisasi di atas
    const btnDockOpenEditor = document.getElementById('btnDockOpenEditor');
    const editorResizer = document.getElementById('editorResizer');

    function setEditorState(isOpen) {
        if (!editorDrawer) return;
        const isMobile = window.innerWidth <= 992;
        if (isMobile) {
            editorDrawer.classList.toggle('is-open', isOpen);
        } else {
            editorDrawer.classList.toggle('is-closed', !isOpen);
        }
        if (btnToggleEditor) btnToggleEditor.classList.toggle('active', isOpen);
        if (btnDockOpenEditor) btnDockOpenEditor.style.display = isOpen ? 'none' : 'flex';
        setTimeout(() => {
            if (canvas && typeof canvas.updateConnectors === 'function') {
                canvas.updateConnectors();
            }
        }, 260);
    }

    if (btnToggleEditor) btnToggleEditor.addEventListener('click', () => {
        const isClosed = editorDrawer.classList.contains('is-closed') || (window.innerWidth <= 992 && !editorDrawer.classList.contains('is-open'));
        setEditorState(isClosed);
    });
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', () => setEditorState(false));
    if (btnDockOpenEditor) btnDockOpenEditor.addEventListener('click', () => setEditorState(true));

    // Resizer Horizontal Editor Kode (Min-Width 280px, Max-Width 650px)
    let isResizingEditor = false;
    if (editorResizer && editorDrawer) {
        editorResizer.addEventListener('mousedown', (e) => {
            isResizingEditor = true;
            editorResizer.classList.add('is-resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const startX = e.clientX;
            const startW = editorDrawer.offsetWidth;

            function onMouseMove(moveEvent) {
                if (!isResizingEditor) return;
                // Geser ke kiri memperlebar editor di sisi kanan
                const newW = Math.max(280, Math.min(650, startW + (startX - moveEvent.clientX)));
                editorDrawer.style.width = newW + 'px';
                editorDrawer.style.minWidth = newW + 'px';
                if (canvas && typeof canvas.updateConnectors === 'function') {
                    canvas.updateConnectors();
                }
            }

            function onMouseUp() {
                isResizingEditor = false;
                editorResizer.classList.remove('is-resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                if (canvas && typeof canvas.updateConnectors === 'function') {
                    canvas.updateConnectors();
                }
            }

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

    // ==========================================
    // FITUR LOCK POSITION (KUNCI POSISI KARTU)
    // ==========================================
    const btnToggleLock = document.getElementById('btnToggleLock');
    const iconLock = document.getElementById('iconLock');
    const labelLock = document.getElementById('labelLock');

    function updateLockUI(isLocked) {
        if (btnToggleLock) {
            btnToggleLock.classList.toggle('active', isLocked);
            btnToggleLock.title = isLocked ? 'Posisi kartu terkunci (Klik untuk membuka)' : 'Posisi kartu bebas (Klik untuk mengunci)';
        }
        if (iconLock) {
            iconLock.className = isLocked ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open';
        }
        if (labelLock) {
            labelLock.textContent = isLocked ? 'Terkunci' : 'Bebas';
        }
    }

    if (btnToggleLock) {
        btnToggleLock.addEventListener('click', () => {
            const locked = canvas.toggleLock();
            updateLockUI(locked);
            showToast(locked ? 'Posisi kartu berhasil dikunci.' : 'Posisi kartu dapat digeser.');
        });
    }

    // ==========================================
    // SINKRONISASI KANVAS KE KODE & DATABASE
    // ==========================================
    canvas.onCodeChange((newCode) => {
        if (codeInput) codeInput.value = newCode;
        if (currentDiagramId) {
            updateSaveStatus('saving', 'Menyimpan perubahan...');
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(async () => {
                try {
                    const thumbData = DiagramExport.generateThumbnail(canvas.getState());
                    const response = await fetch('<?= base_url('diagram/save') ?>', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({
                            id: currentDiagramId,
                            title: currentDiagramTitle,
                            code: newCode,
                            layout_data: canvas.getState().nodePositions ? Object.fromEntries(canvas.getState().nodePositions) : null,
                            thumbnail: thumbData
                        })
                    });
                    const res = await response.json();
                    if (res.success) {
                        updateSaveStatus('saved', 'Tersimpan');
                    } else {
                        updateSaveStatus('unsaved', 'Perubahan belum disimpan');
                    }
                } catch (e) {
                    updateSaveStatus('unsaved', 'Perubahan belum disimpan');
                }
            }, 900);
        } else {
            updateSaveStatus('unsaved', 'Perubahan belum disimpan');
        }
    });

    // ==========================================
    // AUTO ARRANGE ALGORITHM (dbdiagram.io Grade)
    // ==========================================
    const popoverAutoArrange = document.getElementById('popoverAutoArrange');
    const btnCloseArrangePopover = document.getElementById('btnCloseArrangePopover');
    const btnFloatArrange = document.getElementById('btnFloatArrange');
    const btnFloatFit = document.getElementById('btnFloatFit');
    const badgeCurrentAlgo = document.getElementById('badgeCurrentAlgo');
    const arrangeOptions = document.querySelectorAll('.arrange-option');

    const ALGO_MAP = {
        '1': 'left-right',
        '2': 'pipeline',
        '3': 'snowflake',
        '4': 'compact'
    };

    const ALGO_NAMES = {
        'left-right': 'Left-right',
        'pipeline': 'Pipeline',
        'snowflake': 'Snowflake',
        'compact': 'Compact'
    };

    // Pindahkan popover ke body agar tidak pernah terpotong overflow toolbar
    if (popoverAutoArrange && popoverAutoArrange.parentNode !== document.body) {
        document.body.appendChild(popoverAutoArrange);
    }

    function toggleArrangePopover(forceState, triggerBtn = null) {
        if (!popoverAutoArrange) return;
        const shouldShow = forceState !== undefined ? forceState : (popoverAutoArrange.style.display === 'none');
        
        if (shouldShow) {
            popoverAutoArrange.style.display = 'block';
            const btn = triggerBtn || btnRelayout || btnFloatArrange;
            if (btn) {
                const rect = btn.getBoundingClientRect();
                if (btn === btnFloatArrange) {
                    popoverAutoArrange.style.top = 'auto';
                    popoverAutoArrange.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
                    popoverAutoArrange.style.left = Math.max(10, rect.left) + 'px';
                    popoverAutoArrange.style.right = 'auto';
                } else {
                    popoverAutoArrange.style.top = (rect.bottom + 6) + 'px';
                    popoverAutoArrange.style.bottom = 'auto';
                    popoverAutoArrange.style.right = Math.max(10, window.innerWidth - rect.right) + 'px';
                    popoverAutoArrange.style.left = 'auto';
                }
            }
        } else {
            popoverAutoArrange.style.display = 'none';
        }
        if (btnRelayout) btnRelayout.classList.toggle('active', shouldShow);
    }

    if (btnRelayout) {
        btnRelayout.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleArrangePopover(undefined, btnRelayout);
        });
    }

    if (btnFloatArrange) {
        btnFloatArrange.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleArrangePopover(undefined, btnFloatArrange);
        });
    }

    if (btnCloseArrangePopover) {
        btnCloseArrangePopover.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleArrangePopover(false);
        });
    }

    if (btnFloatFit) {
        btnFloatFit.addEventListener('click', () => canvas.autoFit());
    }

    function applyArrangeAlgorithm(algo) {
        if (!algo) return;
        arrangeOptions.forEach(opt => {
            const isMatch = opt.getAttribute('data-algo') === algo;
            opt.classList.toggle('active', isMatch);
        });

        // Update badge angka algoritma aktif
        let badgeNum = '1';
        if (algo === 'pipeline') badgeNum = '2';
        else if (algo === 'snowflake') badgeNum = '3';
        else if (algo === 'compact') badgeNum = '4';
        if (badgeCurrentAlgo) badgeCurrentAlgo.textContent = badgeNum;

        canvas.relayout(algo);
        toggleArrangePopover(false);
        showToast(`Tata letak ${ALGO_NAMES[algo] || algo} berhasil diterapkan.`);
    }

    arrangeOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const algo = opt.getAttribute('data-algo');
            applyArrangeAlgorithm(algo);
        });
    });

    // Keyboard shortcut (1, 2, 3, 4 saat popover terbuka, atau Escape untuk tutup)
    window.addEventListener('keydown', (e) => {
        if (e.target.closest('input, textarea, select')) return;

        if (popoverAutoArrange && popoverAutoArrange.style.display !== 'none') {
            if (e.key === 'Escape') {
                toggleArrangePopover(false);
                return;
            }
            if (ALGO_MAP[e.key]) {
                e.preventDefault();
                applyArrangeAlgorithm(ALGO_MAP[e.key]);
                return;
            }
        }
    });

    // Klik di luar popover untuk menutup otomatis
    document.addEventListener('click', (e) => {
        if (popoverAutoArrange && popoverAutoArrange.style.display !== 'none') {
            if (!e.target.closest('#wrapAutoArrange') && !e.target.closest('#btnFloatArrange') && !e.target.closest('#popoverAutoArrange')) {
                toggleArrangePopover(false);
            }
        }
    });

    // Kontrol Navigasi Kanvas
    btnAutoFit.addEventListener('click', () => canvas.autoFit());
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
                compileAndRender(res.diagram.code, true, loadedLayout);
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        canvas.autoFit();
                    }, 120);
                });
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
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        canvas.autoFit();
                    }, 120);
                });
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

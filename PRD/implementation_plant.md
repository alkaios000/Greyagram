# Rencana Implementasi Greyagram (Implementation Plan)

Berdasarkan dokumen spesifikasi kebutuhan pada `PRD/app.md` dan pedoman aturan pada `PRD/rule.md`, berikut adalah rencana arsitektur dan tahapan pengerjaan modul Diagram Workspace untuk Greyagram.

---

## 1. Analisis Kebutuhan Utama
1. **Input & Parser Sintaks Mermaid (Class Diagram)**:
   - Dukungan parsing sintaks `classDiagram` standar Mermaid (nama class, attributes/properties, methods/functions, stereotipe/annotations, serta tipe relasi: inheritance `<|--`, association `-->`, aggregation `--o`, composition `--*`, dependency `..>`, dan kardinalitas `"1"` ke `"*"`).
   - Validasi error input jika sintaks tidak sesuai.
2. **Hasil Desain Modern & Tidak Tabrakan**:
   - Algoritma auto-layout (Dagre/Grid Layout) terpadu saat render awal agar node kelas tidak saling menumpuk/tabrakan.
   - Desain visual node kelas yang modern, clean, tipografi rapi (Inter font), header pemisah atribut dan method, serta badge tipe akses (`+` public, `-` private, `#` protected).
3. **Workspace Interaktif (Drag & Drop + Garis Dinamis)**:
   - Node kelas dapat digeser (drag & drop) secara bebas di workspace kanvas.
   - Garis relasi/konektor (SVG orthogonal/curved path) secara realtime mengikuti pergerakan posisi node kelas sumber dan target.
4. **Fitur Navigasi & Kanvas (Autofit, Zoom, Pan)**:
   - Fitur **Autofit**: Menghitung bounding box seluruh node yang ada dan menyesuaikan level zoom serta titik tengah kanvas agar seluruh diagram terlihat rapi dalam layar.
   - Zoom In (+), Zoom Out (-), Reset Zoom (100%), dan Pan kanvas (drag kanvas dengan klik tengah atau tombol pan).
5. **Ekspor & Download PNG**:
   - Kemampuan konversi elemen kanvas (nodes + svg lines) ke citra PNG resolusi tinggi dengan latar belakang bersih.
   - Tombol download langsung tanpa merusak tata letak kanvas.
6. **Kesesuaian Aturan (rule.md)**:
   - Desain dominan putih bersih dengan aksen tombol interaksi *soft blue*.
   - Icon resmi Font Awesome (tanpa emoji).
   - Custom thin scrollbar tanpa merusak layout.
   - Struktur MVC rapi: `controllers/diagram_controller.php`, `views/diagram/index_view.php`, `assets/js/diagram/`.
   - Tidak melakukan commit git otomatis.

---

## 2. Struktur File & Modul yang Akan Dibuat
```text
Greyagram/
├── controllers/
│   └── diagram_controller.php       # Controller perutean halaman workspace diagram
├── views/
│   └── diagram/
│       └── index_view.php           # Tampilan workspace kanvas, panel input kode, & toolbar
├── assets/
│   ├── css/
│   │   ├── style.css                # Update styling komponen toolbar, canvas, node card
│   │   └── custom.css               # Penyesuaian custom scrollbar & responsive layout
│   └── js/
│       ├── diagram_parser.js        # Parser sintaks Mermaid classDiagram ke Graph Model
│       ├── diagram_layout.js        # Algoritma auto-layout bebas tabrakan (Dagre/hierarchical)
│       ├── diagram_canvas.js        # Pengendali drag & drop, pan-zoom, relasi garis dinamis
│       └── diagram_export.js        # Fungsi konversi canvas ke PNG download
└── index.php                        # Penambahan routing 'diagram'
```

---

## 3. Rincian Fitur Antarmuka (UI/UX)
- **Top Toolbar**:
  - Tombol **Autofit** (Icon: `fa-solid fa-expand` / `fa-solid fa-arrows-to-eye`)
  - Tombol **Zoom In** (`fa-solid fa-magnifying-glass-plus`), **Zoom Out** (`fa-solid fa-magnifying-glass-minus`), **100% Reset**
  - Tombol **Auto Align / Relayout** (`fa-solid fa-wand-magic-sparkles`) untuk merapikan kembali node secara otomatis
  - Tombol **Download PNG** (`fa-solid fa-download`) dengan feedback loading
  - Toggle buka/tutup **Editor Panel** (`fa-solid fa-code`)
- **Left Panel (Editor & Template)**:
  - Textarea kode Mermaid dengan syntax highlight/monospace font.
  - Template bawaan (contoh: *E-Commerce System*, *User & Auth System*, *School Management System*) untuk pengujian cepat.
  - Tombol "Terapkan Diagram" / auto-update saat mengetik.
- **Center Canvas**:
  - Grid background dot halus berwarna abu-abu sangat muda.
  - Kelas diagram cards (Draggable) dengan styling modern, header elegan, pemisah atribut dan method.
  - Dynamic SVG layer untuk merender garis relasi, label relasi, dan kardinalitas dengan mulus.

---

## 4. Tahapan Pengerjaan & Status
- [x] **Langkah 1**: Registrasi route `diagram` pada `index.php` dan buat `controllers/diagram_controller.php`.
- [x] **Langkah 2**: Perbarui menu sidebar pada `views/layouts/sidebar.php` dan shortcut pada dashboard agar pengguna dapat mengakses modul diagram.
- [x] **Langkah 3**: Buat antarmuka workspace di `views/diagram/index_view.php` sesuai aturan desain `rule.md` (background putih, aksen soft blue, ikon Font Awesome, tanpa emoji, layout immersive).
- [x] **Langkah 4**: Kembangkan modul JS:
  - [x] `assets/js/diagram_parser.js`: Parser Mermaid Class Diagram (ekstraksi kelas, atribut, method, stereotipe, visibilitas, tipe relasi, dan kardinalitas).
  - [x] `assets/js/diagram_layout.js`: Layout engine bebas tabrakan (*collision-free hierarchical layout*).
  - [x] `assets/js/diagram_canvas.js`: Interaksi drag & drop kartu kelas dengan kalkulasi garis relasi dinamis secara realtime, pan kanvas, zoom terpusat kursor, dan fitur Autofit.
  - [x] `assets/js/diagram_export.js`: Mesin ekspor PNG resolusi tinggi (*retina scale 2x*) dengan background putih bersih.
- [x] **Langkah 5**: Pengujian sintaks PHP, pemuatan aset dan modul JS, serta integrasi rute berhasil tanpa error.


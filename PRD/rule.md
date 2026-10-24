# Folder structure
* root folder
> nama_proyek/
│
├── .env                  # Konfigurasi environment (kredensial database, app url, dll)
├── .env.example          # Template file .env untuk dokumentasi/kolaborasi
├── .htaccess             # Konfigurasi Apache (URL rewriting, keamanan dasar)
├── composer.json         # (Opsional) Jika menggunakan Composer untuk autoloader/package pihak ketiga
├── index.php             # Single Entry Point (titik masuk utama semua request)
│
├── assets/               # Aset publik (frontend)
│   ├── css/
│   │   ├── style.css
│   │   └── custom.css
│   ├── js/
│   │   └── main.js
│   ├── img/
│   └── plugins/          # Plugin pihak ketiga (jika tidak pakai CDN/Composer)
│
├── config/               # File konfigurasi aplikasi
│   ├── database.php      # Koneksi database (PDO)
│   └── app.php           # Konfigurasi umum (base URL, timezone, dll)
│
├── controllers/          # Mengatur alur logika bisnis penghubung Model & View
│   ├── auth_controller.php
│   ├── dashboard_controller.php
│   └── user_controller.php
│
├── models/               # Berisi fungsi/query untuk berinteraksi dengan database
│   ├── user_model.php
│   └── product_model.php
│
├── views/                # Tampilan antarmuka (HTML / UI)
│   ├── layouts/          # Bagian berulang (template utama)
│   │   ├── header.php
│   │   ├── footer.php
│   │   └── sidebar.php
│   ├── auth/
│   │   └── login_view.php
│   └── dashboard/
│       └── index_view.php
│
├── helpers/              # Fungsi bantu / reusable functions global
│   ├── security_helper.php # Fungsi sanitasi input, XSS prevention, CSRF
│   └── url_helper.php      # Fungsi redirect, base_url, dll
│
├── middlewares/          # Pengecekan keamanan & hak akses (Session/Auth check)
│   ├── auth_middleware.php
│   └── role_middleware.php
│
└── storage/              # Tempat penyimpanan file privat/log/upload
    ├── logs/             # Catatan error sistem (error logging)
    └── uploads/          # File yang diunggah pengguna (gambar, dokumen)

# Code
* Kerapihan
> pastikan code rapih, gunakan spasi, enter, tab, dll dengan benar. jangan membuat code yang berantakan. dan pastikan code mudah di baca.
* Komentar
> selalu gunakan komentar untuk menjelaskan code yang kompleks atau penting. Jangan terlalu banyak menggunakan komentar, gunakan secukupnya.
* Konsistensi Penamaan (Naming Conventions)
> Selalu gunakan seperti "nama_folder", atau "nama_file", bukan "namaFolder" atau "namaFile".
* Penulisan Kode Bersih (Clean Code & DRY)
> Hindari pengulangan kode (prinsip DRY - Don't Repeat Yourself) dengan mengekstrak logika yang sama ke dalam fungsi, method, atau service/helper yang dapat digunakan kembali. Pastikan kode mudah dibaca (readable) dan dipahami.
* Struktur Direktori
> Terapkan struktur folder yang logis dan mudah dipahami, pisahkan antara frontend dan backend, serta variasikan folder berdasarkan fitur atau jenis file sesuai best practice framework yang digunakan.
* git
> jangan commit apapun, aku yang akan commit secara manual.

# Layouting
* workspace
> tidak ada overflow konten yang membuat object atau konten menjadi tidak konsisten dan memperburuk layout.
* scrollbar
> scrollbar design tidak menggunakan style default tetapi menggunakan style custom, tidak tebal, tidak mempengaruhi layouting dalam arti tidak mempengaruhi width atau height object.
* card
> jangan terlalu sering menggunakan card, hanya gunakan jika benar benar diperlukan, dan gunakanlah dengan rapih. margin dan padding pada card jangan terlalu besar.
* responsive
> saat membuat komponen baru pastikan definisikan juga style responsive nya saat itu juga. gunakan breakpoint untuk tablet dan lg untuk desktop. pastikan semua komponen terlihat bagus di semua ukuran layar.
* SEO (Search Engine Optimization)
> pastikan dalam penulisan struktur selalu ramah untuk SEO atau SEO friendly.


# Design
* icon
> tidak ada icon dengan emoticon, dan tidak semua melulu menggunakan icon, jika menu atau suatu tombol fungsi mengunakan icon maka gunakan dari font awesome.
* warna
> warna pastikan tidak terlalu kontras dengan warna lainnya, latar belakang menggunakan warna putih polos pada awal, semuanya, customisasi warna akan dilakukan di akhir, semua nya. header sidebar dll, akan dibuat menjadi white, kecuali tombol interaksi dibuat menjadi soft blue pada awal.
* animasi
> card di hover tidak perlu ada animasi kecuali nanti ada customisasi dari developer.
* font
> selalu gunakan font yang terlihat resmi, ukuran sesuai dengan h1 h2 h3 h4 h5 h6, gunakan sesuai dengan konteks nya.

# Security
* Validasi & Sanitasi Input
> Selalu lakukan validasi dan sanitasi untuk setiap data yang masuk dari pengguna (user input), baik melalui form, URL parameter, maupun request API, untuk mencegah serangan SQL Injection, XSS (Cross-Site Scripting), dan CSRF.
* Autentikasi & Otorisasi
> Terapkan sistem authentication yang aman (misalnya hashing password menggunakan Bcrypt/Argon2) dan pastikan setiap route atau endpoint memiliki authorization (hak akses) yang jelas sesuai peran (role-based access control).
* Keamanan Konfigurasi & Lingkungan
> Jangan pernah menulis kredensial sensitif (seperti API Key, database password, secret token) secara langsung di dalam kode (hardcoding). Selalu gunakan file .env dan pastikan data sensitif tidak terekspos ke publik (debug mode dimatikan pada lingkungan produksi).

# Backend
* Arsitektur & Struktur Kode (MVC / Clean Architecture)
> Terapkan pemisahan tanggung jawab (separation of concerns) dengan baik. Jaga agar Controller tetap bersih (lean controller), letakkan logika bisnis yang kompleks pada Service Class atau Model, dan gunakan Form Request untuk validasi terpusat.
* Efisiensi Database & Query
> Tulis query database yang efisien. Hindari masalah N+1 query problem dengan menggunakan teknik Eager Loading (with() pada Eloquent). Gunakan database index pada kolom yang sering dijadikan parameter pencarian atau relasi.
* Penanganan Error & Logging
> Gunakan blok try-catch yang tepat untuk menangani error tak terduga. Sediakan pesan response yang ramah bagi pengguna di sisi frontend, sambil mencatat (logging) detail error aslinya di sisi backend untuk kebutuhan debugging.
* RESTful API & Response Konsisten
> Jika membangun endpoint API, gunakan standar penamaan RESTful yang konsisten (misalnya menggunakan HTTP methods GET, POST, PUT, DELETE yang sesuai) dan kembalikan struktur format data JSON yang seragam (menyertakan status, pesan, dan data).

# Fronend
* Manajemen Keadaan & Performa (State Management & Optimization)
> Optimalkan performa frontend dengan meminimalkan ukuran asset (gambar/ikon), melakukan lazy loading pada komponen atau gambar berat, serta menghindari re-render yang tidak perlu pada komponen antarmuka.

# Database
* Desain Skema & Relasi (Schema Design & Relationships)
> Rancang struktur tabel database (schema) dengan normalisasi yang baik untuk menghindari redundansi data. Tentukan tipe data yang paling sesuai (misalnya ENUM untuk status terbatas, DATETIME untuk timestamp, atau UUID untuk primary key) dan definisikan relasi tabel (One-to-One, One-to-Many, Many-to-Many) menggunakan Foreign Key dengan benar.
* Migrations & Seeding
> Selalu gunakan fitur migrasi database (database migrations) untuk membuat atau mengubah struktur tabel secara terkelola dan terversioning. Hindari mengubah struktur tabel secara manual di database. Manfaatkan fitur seeding untuk membuat data awal (dummy data) untuk keperluan pengembangan.
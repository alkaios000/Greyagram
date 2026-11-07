# Prompt Developer: Class Diagram Editor — Auto Layout & Edge Routing

## Tujuan
Perbaiki/bangun engine layout dan routing garis pada aplikasi pembuat Class Diagram agar hasilnya rapi seperti Mermaid / dbdiagram.io: node tidak saling tumpang tindih, garis siku-siku (orthogonal), tidak menembus node, tidak menumpuk, dan tetap rapi saat node di-drag.

## Aturan Kerja
- Baca dulu struktur proyek yang ada. **Pertahankan stack, struktur folder, dan UI yang sudah ada.** Ubah seminimal mungkin di luar modul layout/routing/render.
- Jika belum ada engine layout, gunakan default: **vanilla JS/TS + SVG + `elkjs`** (framework-agnostic). Jika proyek sudah pakai React/Vue, sesuaikan tanpa ganti framework.
- Jangan tambah fitur di luar daftar di bawah. Output kode langsung, penjelasan singkat saja.

## Pipeline Wajib (5 Tahap)

```
Model data → 1. Ukur node → 2. Layout posisi → 3. Anchor/port → 4. Routing edge → 5. Render SVG
```

Pisahkan tiap tahap menjadi modul/fungsi sendiri (`measure.js`, `layout.js`, `anchors.js`, `routing.js`, `render.js`) agar mudah diuji.

### 1. Ukur Node (`measure`)
- Hitung `width` dan `height` dari isi class: nama, atribut, method.
- Gunakan `canvas.measureText` atau `getBBox` (bukan tebakan jumlah karakter).
- Minimal width 140px, tinggi baris 22px, padding horizontal 16px, header 30px.
- Hasil ukuran harus tersedia **sebelum** layout dijalankan.

### 2. Layout Posisi (`layout`)
- Gunakan **elkjs** dengan algoritma `layered`.
- Opsi minimum:
  ```js
  {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.spacing.nodeNode': 60,
    'elk.layered.spacing.nodeNodeBetweenLayers': 90,
    'elk.layered.spacing.edgeNodeBetweenLayers': 30,
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF'
  }
  ```
- Aturan khusus UML:
  - **Inheritance / Realization**: parent selalu di atas child (arahkan edge child → parent, atau balik arah di graph layout).
  - **Association / Aggregation / Composition / Dependency**: boleh horizontal; beri jarak lebih agar label multiplicity muat.
- Jalankan layout secara async, tampilkan indikator loading singkat.

### 3. Anchor / Port (`anchors`)
- Garis **tidak boleh** menuju titik tengah node. Tentukan sisi (`top/right/bottom/left`) berdasarkan posisi relatif node tujuan:
  ```js
  function getSide(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    if (Math.abs(dx) / from.w > Math.abs(dy) / from.h) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'bottom' : 'top';
  }
  ```
- Jika satu sisi punya beberapa edge: **urutkan** berdasarkan koordinat node tujuan (kiri→kanan / atas→bawah), lalu bagi rata titik sambung: `t = (index + 1) / (total + 1)`.
- Self-association: loop tetap di pojok kanan atas node (jalur 4 titik).
- Edge ganda antara 2 node yang sama: offset paralel ±12px per edge.

### 4. Routing Edge (`routing`)
- Gunakan hasil `bendPoints` dari ELK sebagai jalur utama.
- Fallback jika ELK tidak dipakai: jalur orthogonal dengan jarak keluar 24px dari sisi node, tekukan di titik tengah antar dua titik keluar.
- Kondisi wajib:
  - Garis tidak menembus node lain.
  - Minimalkan jumlah tekukan dan persilangan.
  - Segmen sejajar dari edge berbeda diberi jarak minimal 8px.
- Render jalur dengan **sudut membulat** (radius 8px, dibatasi setengah panjang segmen terpendek).

### 5. Render (`render`)
- Urutan SVG: **edge dulu, node kemudian** (node di atas garis).
- Marker ujung garis (definisikan di `<defs>`):
  | Relasi | Marker |
  |---|---|
  | Inheritance | segitiga kosong |
  | Realization | segitiga kosong + garis putus-putus |
  | Composition | belah ketupat penuh |
  | Aggregation | belah ketupat kosong |
  | Association | garis polos / panah terbuka |
  | Dependency | panah terbuka + garis putus-putus |
- Label (nama relasi, multiplicity) diletakkan dekat anchor dengan offset 12–16px dan diberi background putih agar terbaca di atas garis.

## Interaksi & UX
- **Drag node**: snap ke grid 10px. Saat drag, hitung ulang routing **hanya edge yang terhubung** ke node tersebut (real-time, gunakan `requestAnimationFrame`).
- **Anti-tabrakan**: cek AABB collision antar node saat drag/drop; jika bertabrakan, geser ke posisi bebas terdekat.
- **Pinned node**: node yang digeser manual ditandai `pinned: true`. Tombol **"Auto Layout"** hanya menata ulang node yang belum di-pin (opsi: "Reset semua").
- **Pan & zoom**: scroll untuk zoom (pusat di kursor), drag background untuk pan, tombol **Fit to Screen**.
- **Hover/seleksi**: highlight edge dan node yang terhubung, redupkan elemen lain.
- **Undo/Redo** untuk perubahan posisi dan relasi.
- Simpan posisi, pinned, dan relasi ke model data (JSON) sehingga bisa disimpan dan dimuat ulang.

## Model Data (acuan)
```json
{
  "classes": [
    { "id": "c1", "name": "User", "attrs": ["- id: int", "- name: string"], "methods": ["+ login(): bool"], "x": 0, "y": 0, "pinned": false }
  ],
  "relations": [
    { "id": "r1", "from": "c2", "to": "c1", "type": "inheritance", "label": "", "fromMult": "", "toMult": "" }
  ]
}
```
Jika model proyek sudah ada, **adaptasi**, jangan diganti.

## Kriteria Selesai
- [ ] Tidak ada node yang saling tumpang tindih setelah Auto Layout.
- [ ] Tidak ada garis yang menembus node lain.
- [ ] Semua garis siku-siku dengan sudut membulat, titik sambung tersebar rata pada sisi node.
- [ ] Edge ganda dan self-association tampil terpisah dan terbaca.
- [ ] Marker relasi UML benar untuk semua 6 tipe.
- [ ] Drag node terasa lancar (routing hanya edge terkait) dan snap ke grid.
- [ ] Auto Layout menghormati node yang di-pin.
- [ ] Diagram dengan 30+ node tetap rapi dan responsif.
- [ ] Modul layout, anchors, routing, render terpisah dan dapat diuji mandiri.

## Output yang Diharapkan
1. Kode lengkap modul yang diubah/ditambah (path file jelas).
2. Instruksi instalasi dependensi (`npm i elkjs`) jika diperlukan.
3. Ringkasan perubahan maksimal 10 baris.
# Dashboard Analisis Percaya Diri (PD)

Dashboard statis (HTML, CSS, JavaScript) untuk tugas analisis data survei:

- **2a** Statistik deskriptif dan insight otomatis
- **2b** Regresi linear sederhana `y = a + bx` (tiap variabel X dibandingkan dengan PD) + prediksi + langkah hitung manual
- **2c** Regresi linear berganda (jam tidur, tinggi, berat, persepsi kepintaran diri → PD) + simulasi prediksi

## Struktur file
| File | Isi |
|---|---|
| `index.html` | Kerangka halaman |
| `style.css` | Tampilan |
| `stats.js` | Semua rumus statistik dan regresi (sudah diberi komentar) |
| `app.js` | Mengatur tampilan dan teks insight |
| `data.js` | Data bawaan (salinan `data/data_uji.csv`) |
| `data/data_uji.csv` | Data survei asli |

## Menjalankan
Buka `index.html` langsung di browser (perlu internet untuk memuat Plotly). Tidak perlu install apa pun.
Bisa juga unggah CSV lain lewat tombol di bagian "Data Survei".

## Deploy ke GitHub Pages
1. Buat repository baru di GitHub, lalu push semua file ini.
2. Buka **Settings → Pages**.
3. Pada *Build and deployment*, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu **Save**.
4. Tunggu 1–2 menit, situs tersedia di `https://<username>.github.io/<nama-repo>/`.

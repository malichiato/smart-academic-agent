# Smart Academic Agent

Aplikasi web demo untuk membantu mahasiswa mencatat tugas kuliah, melihat prioritas, dan mendapatkan saran pengerjaan.

## Fitur
- Dashboard ringkasan tugas
- Tambah, edit, hapus, dan tandai tugas selesai
- Pencarian dan filter status
- Rekomendasi tugas berdasarkan tenggat, prioritas, dan status
- Antarmuka chat untuk menanyakan prioritas, jadwal, dan tenggat
- Penyimpanan browser menggunakan LocalStorage

## Cara menjalankan
1. Ekstrak folder proyek.
2. Buka `index.html` di browser modern (Chrome, Edge, Firefox).
3. Data demo akan tersedia saat pertama kali membuka aplikasi.
4. Coba tambah/edit/hapus tugas dan gunakan menu AI Assistant.

## Catatan penting
Versi ini merupakan prototipe yang berjalan di browser. Chat assistant memakai logika rekomendasi lokal berbasis data dan aturan, **belum terhubung ke model AI eksternal/API**. Ini sengaja agar proyek mudah dicoba tanpa API key. Untuk memenuhi kebutuhan AI Agent berbasis model bahasa, tahap berikutnya adalah menambahkan backend yang aman dan mengintegrasikan model AI melalui API. Jangan menaruh API key di JavaScript sisi browser.

## Struktur
- `index.html` — struktur halaman
- `style.css` — tampilan responsif
- `app.js` — penyimpanan, pengelolaan tugas, analisis prioritas, dan chat demo

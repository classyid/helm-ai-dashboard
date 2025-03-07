![HelmAI Dashboard Banner](https://helm.ai.classy.id/assets/img/hero-helmet-ai.webp)

## 📋 Deskripsi

HelmAI Dashboard adalah solusi manajemen toko helm komprehensif yang menggabungkan kemudahan Google Spreadsheet sebagai interface admin dengan asisten AI untuk pelanggan. Sistem ini dirancang untuk memudahkan pengelolaan produk helm dengan berbagai variasi serta meningkatkan pengalaman pelanggan melalui asisten pintar.

## ✨ Fitur

- **Manajemen Produk** - Kelola detail produk helm termasuk merk, kategori, stok, dan harga
- **Manajemen Variasi Warna** - Catat ketersediaan helm dalam berbagai warna dengan visualisasi
- **Pengelolaan Kategori** - Organisasikan produk dalam kategori yang fleksibel
- **Sistem Promosi** - Kelola diskon dan promosi dengan waktu aktif yang dapat diatur
- **Informasi Toko** - Kelola data toko fisik termasuk alamat dan jam operasional
- **Jadwal Live Shopping** - Atur jadwal live streaming penjualan di berbagai platform
- **Pengelolaan API Key** - Sistem keamanan multi-level untuk akses API
- **HelmAI Assistant** - Asisten berbasis AI yang membantu pelanggan menemukan helm yang tepat

## 🔧 Teknologi

- Google Apps Script
- Google Spreadsheet
- RESTful API
- HelmAi (Backend)

## 📚 Arsitektur Sistem

```
┌─────────────────┐      ┌───────────────┐      ┌───────────────┐
│  Google Sheet   │<────>│  Apps Script  │<────>│  REST API     │
│  (Admin UI)     │      │  Controllers  │      │  Endpoints    │
└─────────────────┘      └───────────────┘      └───────┬───────┘
                                                        │
                                                ┌───────┴───────┐
                                                │  Database     │
                                                │  (Products,   │
                                                │  Categories)  │
                                                └───────┬───────┘
                                                        │
┌─────────────────┐      ┌───────────────┐      ┌───────┴───────┐
│  Customer Chat  │<────>│  HelmAI       │<────>│  Product Data │
│  Interface      │      │  Assistant    │      │  Access Layer │
└─────────────────┘      └───────────────┘      └───────────────┘
```

## 🚀 Deployment

### Prasyarat

- Akun Google Workspace atau Google personal
- Akun Apikey HelmAi


### Setup Google Apps Script

1. Buat Google Spreadsheet baru
2. Buka menu Extensions > Apps Script
3. Copy-paste kode dari folder `apps-script` ke editor
4. Simpan project dan berikan nama
5. Deploy sebagai add-on dengan mengikuti petunjuk di [Google Apps Script Deployment Guide](https://developers.google.com/apps-script/concepts/deployments)


### API Endpoints

Endpoint API yang tersedia:

- `GET /api/helm/admin/products` - Mendapatkan semua produk
- `POST /api/helm/admin/products` - Menambahkan produk baru
- `PUT /api/helm/admin/products` - Memperbarui produk
- `DELETE /api/helm/admin/products` - Menghapus produk

*(dan lainnya untuk categories, colors, promotions, dll)*

### Authentikasi

API menggunakan API key untuk otentikasi. Semua request harus menyertakan header:

```
X-API-Key: your_api_key_here
```

## 👥 Kontribusi

Kontribusi sangat diterima! Silakan lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk detail lebih lanjut.

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).

## 📞 Kontak

Untuk pertanyaan dan dukungan, silakan hubungi kami di [support@example.com](mailto:kontak@classy.id) atau buka issue di repository GitHub.

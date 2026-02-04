# 📚 PANDUAN LENGKAP - CAHAYA PHONE CRM

## 📋 DAFTAR ISI
1. [Persiapan](#persiapan)
2. [Setup Database](#setup-database)
3. [Setup Backend](#setup-backend)
4. [Setup WhatsApp API](#setup-whatsapp-api)
5. [Menjalankan Aplikasi](#menjalankan-aplikasi)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🛠️ PERSIAPAN

### Software yang Dibutuhkan:

1. **Node.js** (v14 atau lebih baru)
   - Download: https://nodejs.org/
   - Pilih versi LTS
   
2. **XAMPP** (untuk MySQL)
   - Download: https://www.apachefriends.org/
   
3. **Text Editor** (opsional)
   - VS Code: https://code.visualstudio.com/
   
4. **WhatsApp API Account**
   - Fonnte: https://fonnte.com/ (Recommended)
   - Wablas: https://wablas.com/

---

## 💾 SETUP DATABASE

### Langkah 1: Start MySQL

1. Buka **XAMPP Control Panel**
2. Klik **Start** pada Apache dan MySQL
3. Tunggu sampai kedua service berwarna hijau

### Langkah 2: Import Database

1. Buka browser, ke: **http://localhost/phpmyadmin**
2. Klik tab **"SQL"** di menu atas
3. Copy seluruh isi file **`database.sql`**
4. Paste ke kotak SQL query
5. Klik tombol **"Go"**

### Langkah 3: Verifikasi Database

Pastikan database **`cahaya_phone_crm`** sudah terbuat dengan:
- ✅ Table: `admins` (1 row - default admin)
- ✅ Table: `customers` (2 row contoh)
- ✅ Table: `messages` (3 row contoh)
- ✅ View: `customer_stats`

---

## ⚙️ SETUP BACKEND

### Langkah 1: Install Dependencies

```bash
cd backend
npm install
```

Tunggu sampai selesai (biasanya 1-2 menit)

### Langkah 2: Konfigurasi .env

File `.env` sudah ada, tapi perlu disesuaikan:

```env
# Database (sesuaikan jika berbeda)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=cahaya_phone_crm

# Server
PORT=5000

# JWT Secret (bisa diganti dengan string random)
JWT_SECRET=cahaya-phone-secret-key-12345

# WhatsApp API (akan diisi nanti)
WHATSAPP_API_URL=https://api.fonnte.com/send
WHATSAPP_API_KEY=your-api-key-here
WHATSAPP_SENDER=6281234567890

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:5500
```

⚠️ **PENTING**: Jangan ubah dulu `WHATSAPP_API_KEY` - akan diatur di langkah berikutnya.

---

## 📱 SETUP WHATSAPP API

### Option 1: Menggunakan FONNTE (Recommended)

1. **Daftar di Fonnte**
   - Kunjungi: https://fonnte.com/
   - Klik "Register" / "Daftar"
   - Isi form pendaftaran

2. **Dapatkan API Key**
   - Login ke dashboard Fonnte
   - Buka menu **"Account" → "API"**
   - Copy **API Token** Anda

3. **Hubungkan WhatsApp**
   - Scan QR Code untuk menghubungkan WhatsApp
   - Pastikan status **"Connected"**

4. **Update .env**
   ```env
   WHATSAPP_API_URL=https://api.fonnte.com/send
   WHATSAPP_API_KEY=isi-dengan-api-token-anda
   WHATSAPP_SENDER=628xxx  # Nomor WA yang dikoneksikan
   ```

5. **Setup Webhook**
   - Buka menu **"Webhook"** di dashboard Fonnte
   - Set Webhook URL: `http://your-domain.com/api/webhook/whatsapp`
   - Jika testing lokal, gunakan **ngrok** (dijelaskan di bawah)

### Option 2: Menggunakan WABLAS

1. **Daftar di Wablas**
   - Kunjungi: https://wablas.com/
   - Pilih paket yang sesuai

2. **Dapatkan Token**
   - Login ke dashboard
   - Copy **Device Token**

3. **Update .env**
   ```env
   WHATSAPP_API_URL=https://solo.wablas.com/api/send-message
   WHATSAPP_API_KEY=isi-dengan-device-token
   WHATSAPP_SENDER=628xxx
   ```

4. **Update webhook controller** di `backend/config/whatsapp.js`:
   - Uncomment bagian Wablas
   - Comment bagian Fonnte

### Testing Lokal dengan NGROK (untuk Webhook)

Webhook butuh URL publik. Untuk testing lokal:

1. **Download ngrok**: https://ngrok.com/download
2. **Jalankan ngrok**:
   ```bash
   ngrok http 5000
   ```
3. **Copy URL** yang muncul (contoh: `https://abc123.ngrok.io`)
4. **Set di WhatsApp API**:
   - Fonnte Webhook: `https://abc123.ngrok.io/api/webhook/whatsapp`

---

## 🚀 MENJALANKAN APLIKASI

### Langkah 1: Jalankan Backend

```bash
cd backend
npm start
```

**Output yang benar:**
```
============================================
🚀 CAHAYA PHONE CRM - BACKEND SERVER
============================================
📡 Server running on: http://localhost:5000
🌍 Environment: development
📊 Database: cahaya_phone_crm
============================================
✅ Database connected successfully
```

⚠️ **JANGAN TUTUP TERMINAL INI!**

### Langkah 2: Buka Customer Form

**Option A - Langsung Buka File:**
1. Buka folder `customer`
2. Klik kanan `index.html`
3. **Open with → Browser** (Chrome/Firefox/Edge)

**Option B - Menggunakan Live Server (VS Code):**
1. Install extension **"Live Server"** di VS Code
2. Klik kanan `customer/index.html`
3. **Open with Live Server**

URL: `http://127.0.0.1:5500/customer/index.html`

### Langkah 3: Buka Admin Panel

**Login Page:**
1. Buka folder `admin`
2. Klik kanan `index.html`
3. **Open with → Browser**

URL: `http://127.0.0.1:5500/admin/index.html`

**Login Credentials:**
```
Username: admin
Password: admin123
```

---

## ✅ TESTING

### Test 1: Submit Customer Form

1. Buka **Customer Form**
2. Isi semua data:
   - Nama: John Doe
   - WhatsApp: 081234567890
   - Sales: Sales A
   - Merk: iPhone
   - Tipe: 15 Pro Max
   - Harga: 18000000
   - Qty: 1
   - Pilih metode pembayaran
3. Klik **"Kirim Pendaftaran"**
4. **Harusnya:**
   - ✅ Muncul alert sukses
   - ✅ Data tersimpan ke database
   - ✅ WhatsApp otomatis terkirim (jika API sudah disetup)

### Test 2: Login Admin

1. Buka **Admin Login**
2. Masukkan username: `admin`, password: `admin123`
3. Klik **Login**
4. **Harusnya:**
   - ✅ Redirect ke dashboard
   - ✅ Muncul nama admin
   - ✅ Statistik terisi

### Test: Forgot / Reset Password

1. Jika lupa password atau username, buka `admin/forgot.html` dan masukkan username atau email.
2. Jika mail dikonfigurasi (lihat `.env.example`), link reset akan dikirim via email.
3. Jika mail tidak dikonfigurasi (development), API akan mengembalikan reset token di respons; gunakan token di `admin/reset.html?token=...` untuk mengganti password.
4. Setelah reset, login dengan password baru harus berhasil.

### Test 3: Lihat Dashboard

Di Dashboard harusnya terlihat:
- ✅ Total Customer
- ✅ Customer dari Instagram
- ✅ Customer dari Website
- ✅ Customer Baru
- ✅ Tabel customer terbaru

### Test 4: Lihat Semua Customer

1. Klik menu **"Customers"**
2. **Harusnya:**
   - ✅ Muncul tabel lengkap semua customer
   - ✅ Bisa search customer
   - ✅ Bisa filter by source
   - ✅ Bisa klik "Detail" untuk lihat info lengkap

### Test 5: Lihat Chat Log

1. Klik menu **"Chat Log"**
2. **Harusnya:**
   - ✅ Muncul semua pesan WhatsApp
   - ✅ Ada label "Masuk" dan "Keluar"
   - ✅ Tercatat nama customer dan waktu

### Test 6: Webhook WhatsApp (Advanced)

Jika sudah setup webhook:

1. Kirim pesan WhatsApp ke nomor yang terkoneksi
2. Ketik: "Halo saya dari Instagram"
3. **Harusnya:**
   - ✅ Customer baru otomatis tersimpan
   - ✅ Source = "Instagram"
   - ✅ Pesan masuk tercatat di Chat Log
   - ✅ Auto-reply terkirim

---

## 🔧 TROUBLESHOOTING

### ❌ Backend Tidak Bisa Jalan

**Error: "Cannot find module"**
```bash
cd backend
rm -rf node_modules
npm install
npm start
```

**Error: "Database connection failed"**
- Cek XAMPP MySQL sudah jalan
- Cek username/password di `.env`
- Cek database sudah diimport

**Error: "Port 5000 already in use"**
- Ganti PORT di `.env` ke 5001 atau 3000
- Atau matikan aplikasi yang pakai port 5000

### ❌ Customer Form Tidak Bisa Submit

**Error: "Tidak dapat terhubung ke server"**
- Pastikan backend sudah jalan
- Buka http://localhost:5000 di browser, harusnya muncul JSON

**Error: "CORS policy"**
- Update `ALLOWED_ORIGINS` di `.env` backend
- Tambahkan URL customer form Anda

### ❌ Login Admin Gagal

**"Username atau password salah"**
- Cek database, table `admins` harus ada 1 row
- Password default sudah di-hash: `admin123`

**"Token tidak valid"**
- Clear browser localStorage:
  - F12 → Application → Local Storage → Clear
- Login ulang

### ❌ WhatsApp Tidak Terkirim

**"WhatsApp send failed"**
- Cek API Key sudah benar di `.env`
- Cek saldo/kuota WhatsApp API
- Cek nomor WhatsApp valid (format: 628xxx)
- Cek log di terminal backend untuk detail error

**Webhook tidak berfungsi**
- Pastikan URL webhook benar
- Untuk lokal, harus pakai ngrok
- Cek Webhook URL di dashboard WhatsApp API

### ❌ Dashboard Kosong

**"Loading terus"**
- Buka Console Browser (F12)
- Lihat error apa yang muncul
- Biasanya masalah token atau API endpoint

**Data tidak muncul**
- Pastikan backend masih jalan
- Cek token masih valid (logout → login lagi)
- Cek database ada data customer

---

## 📊 STRUKTUR DATABASE

### Table: customers

| Field | Type | Keterangan |
|-------|------|------------|
| id | INT | Primary key |
| nama_lengkap | VARCHAR(100) | Nama customer |
| nama_sales | VARCHAR(100) | Nama sales yang handle |
| merk_unit | VARCHAR(100) | Merk HP (iPhone, Samsung, dll) |
| tipe_unit | VARCHAR(100) | Tipe HP (15 Pro Max, dll) |
| harga | DECIMAL(15,2) | Harga unit |
| qty | INT | Jumlah unit |
| tanggal_lahir | DATE | Tanggal lahir customer |
| alamat | TEXT | Alamat lengkap |
| whatsapp | VARCHAR(20) | Nomor WhatsApp (format: 628xxx) |
| metode_pembayaran | VARCHAR(50) | Cash/Transfer/Kredit/Cicilan |
| tahu_dari | VARCHAR(50) | Instagram/Website/Teman/dll |
| source | VARCHAR(20) | Website / Instagram / Unknown |
| status | VARCHAR(20) | New / Existing |
| created_at | TIMESTAMP | Tanggal daftar |

### Table: messages

| Field | Type | Keterangan |
|-------|------|------------|
| id | INT | Primary key |
| customer_id | INT | ID customer (foreign key) |
| direction | ENUM('in','out') | Arah pesan (masuk/keluar) |
| message | TEXT | Isi pesan |
| sent_at | TIMESTAMP | Waktu kirim |

---

## 📱 API ENDPOINTS

### Public Endpoints (No Auth)

```
POST /api/form-submit
- Submit customer form dari website
- Body: { nama_lengkap, whatsapp, ... }

POST /api/webhook/whatsapp
- Webhook untuk pesan WhatsApp masuk
- Body: { sender, message, ... }

POST /api/admin/login
- Login admin
- Body: { username, password }
```

### Protected Endpoints (Require Token)

```
GET /api/admin/stats
- Statistik dashboard
- Header: Authorization: Bearer {token}

GET /api/admin/customers
- List semua customer
- Header: Authorization: Bearer {token}

GET /api/admin/customers/:id
- Detail customer by ID
- Header: Authorization: Bearer {token}

GET /api/admin/messages
- List semua pesan (100 terakhir)
- Header: Authorization: Bearer {token}

GET /api/admin/messages/:customerId
- Pesan by customer ID
- Header: Authorization: Bearer {token}
```

---

## 🎯 FITUR LENGKAP

### Customer Form:
✅ Form pendaftaran lengkap dengan 12+ field
✅ Validasi input otomatis
✅ Format nomor WhatsApp otomatis
✅ Submit ke database
✅ Kirim WhatsApp auto-reply
✅ Source otomatis = "Website"

### Webhook WhatsApp:
✅ Terima pesan masuk otomatis
✅ Deteksi nomor baru → buat customer otomatis
✅ Deteksi source dari pesan (Instagram/Facebook/TikTok)
✅ Simpan semua chat ke database
✅ Kirim welcome message untuk customer baru

### Admin Dashboard:
✅ Login dengan JWT authentication
✅ Statistik lengkap (Total, Instagram, Website, New)
✅ Tabel customer terbaru
✅ View all customers dengan search & filter
✅ Detail customer modal
✅ Chat log dengan filter arah pesan
✅ Responsive design

---

## 🔒 SECURITY

✅ Password admin di-hash dengan bcrypt
✅ JWT token untuk authentication
✅ Token expires dalam 24 jam
✅ Protected routes dengan middleware
✅ SQL injection protection dengan prepared statements
✅ CORS configuration
✅ Input validation & sanitization

---

## 📝 CATATAN PENTING

1. **Jangan commit file `.env` ke Git!**
   - Sudah ada di `.gitignore`

2. **Ganti JWT_SECRET di production!**
   - Generate random string: https://generate-secret.vercel.app

3. **Backup database secara berkala**

4. **Untuk production:**
   - Deploy backend ke VPS/Cloud
   - Setup domain & SSL
   - Update WhatsApp API webhook URL
   - Ganti password admin default

5. **Monitor WhatsApp API:**
   - Cek saldo/kuota rutin
   - Pastikan device tetap connected

---

## 💡 TIPS & TRICKS

1. **Testing tanpa WhatsApp API:**
   - Comment line kirim WhatsApp di controller
   - Fokus ke logika database dulu

2. **Lihat log backend:**
   - Semua request tercatat di terminal
   - Debug dengan `console.log()`

3. **Browser Console sangat membantu:**
   - F12 → Console
   - Lihat error JavaScript

4. **Database tool:**
   - Gunakan phpMyAdmin untuk cek data
   - Atau install MySQL Workbench

---

## 🆘 BUTUH BANTUAN?

Jika masih ada error:

1. **Cek log di terminal backend**
2. **Cek Console browser (F12)**
3. **Cek database di phpMyAdmin**
4. **Restart backend & clear browser cache**

---

## ✨ SELAMAT!

Aplikasi Cahaya Phone CRM sudah siap digunakan! 🎉

**Happy Coding!** 🚀
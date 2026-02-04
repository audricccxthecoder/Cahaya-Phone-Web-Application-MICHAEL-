# CONTOH PAYLOAD WEBHOOK WHATSAPP

## FONNTE WEBHOOK PAYLOAD

### Pesan Teks Masuk
```json
{
  "device": "6281234567890",
  "sender": "6281298765432",
  "message": "Halo saya dari Instagram",
  "member": {
    "jid": "6281298765432@s.whatsapp.net",
    "name": "John Doe"
  },
  "pushname": "John Doe"
}
```

### Pesan dengan Media
```json
{
  "device": "6281234567890",
  "sender": "6281298765432",
  "message": "Ini foto produk",
  "media": {
    "url": "https://example.com/image.jpg",
    "mimetype": "image/jpeg",
    "filename": "image.jpg"
  },
  "member": {
    "jid": "6281298765432@s.whatsapp.net",
    "name": "John Doe"
  }
}
```

## WABLAS WEBHOOK PAYLOAD

### Pesan Teks Masuk
```json
{
  "phone": "6281298765432",
  "message": "Halo saya dari Instagram",
  "pushname": "John Doe",
  "timestamp": "1234567890",
  "device": "6281234567890"
}
```

### Pesan dengan Media
```json
{
  "phone": "6281298765432",
  "message": "Ini foto produk",
  "pushname": "John Doe",
  "timestamp": "1234567890",
  "device": "6281234567890",
  "media": {
    "url": "https://example.com/image.jpg",
    "mimetype": "image/jpeg"
  }
}
```

## CARA TESTING WEBHOOK

### 1. Testing dengan Postman/Insomnia

**Endpoint**: `http://localhost:5000/api/webhook/whatsapp`
**Method**: POST
**Headers**: 
```
Content-Type: application/json
```

**Body** (Fonnte format):
```json
{
  "device": "6281234567890",
  "sender": "6281298765432",
  "message": "Halo saya dari Instagram",
  "member": {
    "jid": "6281298765432@s.whatsapp.net",
    "name": "Test Customer"
  },
  "pushname": "Test Customer"
}
```

### 2. Testing dengan cURL

```bash
curl -X POST http://localhost:5000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "6281298765432",
    "message": "Halo saya dari Instagram",
    "member": {
      "name": "Test Customer"
    }
  }'
```

### 3. Verifikasi

Setelah kirim webhook:
1. Cek terminal backend - harusnya ada log "Webhook received"
2. Cek database table `customers` - harusnya ada customer baru
3. Cek database table `messages` - harusnya ada pesan masuk
4. Login admin → lihat Chat Log

## SETUP WEBHOOK DI WHATSAPP API

### Fonnte

1. Login ke dashboard Fonnte
2. Buka menu **"Webhook"**
3. Masukkan URL webhook:
   - Production: `https://yourdomain.com/api/webhook/whatsapp`
   - Testing (ngrok): `https://abc123.ngrok.io/api/webhook/whatsapp`
4. Klik **"Save"**

### Wablas

1. Login ke dashboard Wablas
2. Buka menu **"Webhook"**
3. Masukkan URL webhook
4. Pilih event: **"Message Received"**
5. Klik **"Save"**

## TESTING WEBHOOK REAL

1. Kirim pesan WhatsApp ke nomor yang terkoneksi
2. Ketik: "Halo saya dari Instagram"
3. Cek:
   - Terminal backend ada log
   - Database ada customer baru
   - Admin dashboard bertambah customer
   - Chat log tercatat

## TROUBLESHOOTING

### Webhook tidak berfungsi

**1. Cek URL webhook benar:**
```bash
# Test endpoint
curl http://localhost:5000/api/webhook/test
```

**2. Untuk testing lokal, gunakan ngrok:**
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 5000

# Copy URL yang muncul, contoh:
# https://abc123.ngrok.io

# Set di WhatsApp API:
# https://abc123.ngrok.io/api/webhook/whatsapp
```

**3. Cek log backend:**
- Harusnya muncul "Webhook received" di terminal
- Lihat payload yang diterima
- Lihat error jika ada

**4. Cek firewall:**
- Pastikan port 5000 tidak diblokir
- Untuk server, pastikan firewall allow port 5000

### Webhook terkirim tapi customer tidak tersimpan

**Cek Console/Log:**
```javascript
console.log('Webhook received:', JSON.stringify(req.body, null, 2));
```

**Cek format payload:**
- Fonnte: pakai field `sender`
- Wablas: pakai field `phone`
- Sesuaikan dengan kode di `webhookController.js`

## RESPONSE WEBHOOK

Backend akan return response:

### Success
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "customer_id": 123,
  "status": "New"
}
```

### Error (tetap return 200 agar tidak retry)
```json
{
  "success": false,
  "message": "Error processing webhook",
  "error": "Error message here"
}
```
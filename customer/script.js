// ============================================
// CUSTOMER FORM JAVASCRIPT
// ============================================

const API_URL = '/api';

// Form elements
const form = document.getElementById('customerForm');
const submitBtn = document.getElementById('submitBtn');
const alert = document.getElementById('alert');

// Show alert message
function showAlert(message, type = 'success') {
    alert.textContent = message;
    alert.className = `alert ${type} show`;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
    }, 5000);
    
    // Scroll to alert
    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Format WhatsApp number
function formatWhatsApp(number) {
    // Remove all non-digits
    let cleaned = number.replace(/\D/g, '');
    
    // Convert 08xxx to 628xxx
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    
    return cleaned;
}

// Validate form
function validateForm(formData) {
    // Validate required fields
    if (!formData.nama_lengkap || !formData.whatsapp) {
        showAlert('Nama lengkap dan WhatsApp wajib diisi', 'error');
        return false;
    }
    
    // Validate WhatsApp format
    const whatsapp = formData.whatsapp.replace(/\D/g, '');
    if (whatsapp.length < 10 || whatsapp.length > 15) {
        showAlert('Nomor WhatsApp tidak valid', 'error');
        return false;
    }
    
    return true;
}

// Handle form submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = {
        nama_lengkap: document.getElementById('nama_lengkap').value.trim(),
        // Also send `nama` for backward compatibility with backend
        nama: document.getElementById('nama_lengkap').value.trim(),
        nama_sales: document.getElementById('nama_sales').value.trim(),
        merk_unit: document.getElementById('merk_unit').value,
        tipe_unit: document.getElementById('tipe_unit').value.trim(),
        harga: document.getElementById('harga').value,
        qty: document.getElementById('qty').value || 1,
        tanggal_lahir: document.getElementById('tanggal_lahir').value,
        alamat: document.getElementById('alamat').value.trim(),
        whatsapp: document.getElementById('whatsapp').value.trim(),
        metode_pembayaran: document.getElementById('metode_pembayaran').value,
        tahu_dari: document.getElementById('tahu_dari').value
    };
    
    // Validate
    if (!validateForm(formData)) {
        return;
    }
    
    // Format WhatsApp
    formData.whatsapp = formatWhatsApp(formData.whatsapp);
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
    
    try {
        const response = await fetch(`${API_URL}/form-submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('✅ Data berhasil disimpan! Pesan WhatsApp akan segera dikirim.', 'success');
            
            // Reset form
            form.reset();
            
            // Optional: Show WhatsApp status
            if (result.whatsapp_sent) {
                setTimeout(() => {
                    showAlert('✅ Pesan WhatsApp berhasil dikirim!', 'success');
                }, 2000);
            }
        } else {
            showAlert('❌ ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Submit error:', error);
        showAlert('❌ Tidak dapat terhubung ke server. Pastikan backend sudah berjalan.', 'error');
    } finally {
        // Enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Pendaftaran';
    }
});

// Auto-format WhatsApp input
document.getElementById('whatsapp').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Limit length
    if (value.length > 13) {
        value = value.substring(0, 13);
    }
    
    e.target.value = value;
});

// Auto-format price input
document.getElementById('harga').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    e.target.value = value;
});

console.log('✅ Customer Form initialized');
console.log('📡 API URL:', API_URL);
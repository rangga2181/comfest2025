// KODE SERVER.JS FINAL YANG SUDAH DIBERSIHKAN DAN DIPERBAIKI

// --- 1. Import Semua Paket ---
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const validator = require('validator');

// --- 2. Inisialisasi & Konfigurasi Dasar ---
const app = express();
const port = 3000;
const saltRounds = 10; // Untuk bcrypt

// --- 3. Konfigurasi Middleware (URUTAN PENTING!) ---
app.use(cors({
    origin: 'http://127.0.0.1:5500', // Izinkan origin dari Live Server
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Konfigurasi Sesi
app.use(session({
    name: 'sea_catering.sid', // Memberi nama eksplisit pada cookie sesi Anda
    secret: 'ganti-dengan-string-acak-yang-sangat-panjang-dan-rahasia-sekali',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,      // Cookie tidak bisa diakses via JavaScript di browser
        secure: false,       // Set ke `true` hanya jika Anda menggunakan HTTPS
        maxAge: 24 * 60 * 60 * 1000, // Durasi cookie: 1 hari
        sameSite: 'lax'      // Kebijakan SameSite yang baik untuk setup ini
    }
}));

// Konfigurasi CSRF Protection
const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);


// --- 4. Koneksi Database ---
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sea_catering_db'
}).promise(); // Menggunakan .promise() untuk memakai async/await


// --- 5. Middleware Custom untuk Otorisasi ---
const isAuth = (req, res, next) => {
    if (req.session.user) {
        return next(); // Pengguna sudah login, lanjutkan ke request berikutnya
    }
    res.status(401).json({ status: 'error', message: 'Akses ditolak. Silakan login terlebih dahulu.' });
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next(); // Pengguna adalah admin, lanjutkan
    }
    res.status(403).json({ status: 'error', message: 'Akses ditolak. Hanya untuk admin.' });
};


// --- 6. Rute API (Endpoints) ---

// Rute untuk mendapatkan CSRF token
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Rute untuk mengecek status otentikasi
app.get('/api/auth/check', (req, res) => {
    if (req.session.user) {
        res.json({ status: 'success', user: req.session.user });
    } else {
        res.json({ status: 'error', message: 'No active session' });
    }
});

// Rute untuk Registrasi
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !validator.isEmail(email) || !validator.isStrongPassword(password)) {
        return res.status(400).json({ status: 'error', message: 'Input tidak valid. Pastikan email valid dan password kuat.' });
    }
    try {
        const [users] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
        if (users.length > 0) {
            return res.status(409).json({ status: 'error', message: 'Email sudah terdaftar.' });
        }
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await db.query("INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword]);
        res.status(201).json({ status: 'success', message: 'Registrasi berhasil! Silakan login.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server.' });
    }
});

// Rute untuk Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({status: 'error', message: 'Email dan password wajib diisi.'});
    try {
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Email tidak ditemukan.' });
        }
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.user = { id: user.id, name: user.full_name, email: user.email, role: user.role };
            res.json({ status: 'success', message: 'Login berhasil!', user: req.session.user });
        } else {
            res.status(401).json({ status: 'error', message: 'Password salah.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server.' });
    }
});

// Rute untuk Logout
app.post('/api/auth/logout', isAuth, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({status: 'error', message: 'Gagal logout.'});
        }
        // FIX: Hapus cookie dengan nama yang benar
        res.clearCookie('sea_catering.sid'); 
        res.json({status: 'success', message: 'Logout berhasil.'});
    });
});

// Rute untuk Submit Langganan (DILINDUNGI)
app.post('/api/subscribe', isAuth, async (req, res) => {
    const user_id = req.session.user.id;
    const { name, phone, plan, meal_type, delivery_days, allergies } = req.body;
    if(!name || !phone || !plan || !meal_type || !delivery_days) return res.status(400).json({status:'error', message:'Data langganan tidak lengkap.'});
    
    const planPrices = { diet: 30000, protein: 40000, royal: 60000 };
    const planPrice = planPrices[plan] || 0;
    const totalPrice = planPrice * meal_type.length * delivery_days.length * 4.3;

    try {
        await db.query( "INSERT INTO subscriptions (user_id, customer_name, phone_number, plan_name, plan_price, meal_types, delivery_days, allergies, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [user_id, name, phone, plan, planPrice, meal_type.join(', '), delivery_days.join(', '), allergies, totalPrice] );
        res.json({ status: 'success', message: 'Langganan berhasil disimpan!' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Gagal menyimpan langganan.' });
    }
});

// Rute untuk Testimoni
app.get('/api/testimonials', async (req, res) => {
    try {
        const [testimonials] = await db.query("SELECT customer_name, review_message, rating FROM testimonials ORDER BY submission_date DESC");
        res.json({ status: 'success', data: testimonials });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Gagal mengambil data testimoni.' });
    }
});

app.post('/api/testimonials', isAuth, async (req, res) => {
    const { rating, review_message } = req.body;
    const { id: user_id, name: customer_name } = req.session.user;
    if (!rating || !review_message) {
        return res.status(400).json({ status: 'error', message: 'Rating dan ulasan tidak boleh kosong.' });
    }
    try {
        await db.query("INSERT INTO testimonials (user_id, customer_name, review_message, rating) VALUES (?, ?, ?, ?)", [user_id, customer_name, review_message, rating]);
        res.status(201).json({ 
            status: 'success', 
            message: 'Terima kasih atas ulasan Anda!',
            data: { customer_name, review_message, rating: parseInt(rating) }
        });
    } catch(err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Gagal menyimpan testimoni.' });
    }
});

// --- 7. Penanganan Error & Jalankan Server ---
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        console.error('CSRF Token Error Detected! Pastikan frontend mengirim token dengan benar.');
        res.status(403).json({status: 'error', message: 'Form tidak valid atau sesi telah berakhir.'});
    } else {
        next(err);
    }
});

app.listen(port, () => {
    console.log(`Server aman SEA Catering berjalan di http://localhost:${port}`);
});
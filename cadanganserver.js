// main.js - Versi Multi-Page Application
const API_BASE_URL = 'http://127.0.0.1:3000/api';
let csrfToken = null;
let testimonialsData = [], currentTestimonialIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    setupNavbarAndAuth();
    if (document.getElementById('homepage-content')) setupHomepage();
    if (document.getElementById('subscription-content')) setupSubscriptionPage();
    if (document.getElementById('subscription-list-container')) setupUserDashboardPage();
    if (document.getElementById('admin-content')) setupAdminDashboardPage();
});

async function setupNavbarAndAuth() {
    const navUI = document.getElementById('nav-dynamic-content');
    const authModal = document.getElementById('auth-modal');
    
    try {
        const csrfRes = await fetch(`${API_BASE_URL}/csrf-token`, { credentials: 'include' });
        const csrfData = await csrfRes.json();
        csrfToken = csrfData.csrfToken;

        const authRes = await fetch(`${API_BASE_URL}/auth/check`, { credentials: 'include' });
        const authData = await authRes.json();

        if (authData.status === 'success') {
            let navLinks = `<li><a href="dashboard.html">My Dashboard</a></li><li><a href="subscription.html">Subscription</a></li>`;
            if (authData.user.role === 'admin') navLinks += `<li><a href="admin.html">Admin Dashboard</a></li>`;
            navUI.innerHTML = `<ul class="nav-links"><li><span class="nav-text">Welcome, ${escapeHTML(authData.user.name)}!</span></li>${navLinks}<li><a href="#" id="logout-btn">Logout</a></li></ul>`;
            document.getElementById('logout-btn').addEventListener('click', handleLogout);
        } else {
            navUI.innerHTML = `<ul class="nav-links"><li><a href="subscription.html">Subscription</a></li><li><a id="login-nav-btn">Login/Register</a></li></ul>`;
            if (document.getElementById('login-nav-btn')) {
                document.getElementById('login-nav-btn').addEventListener('click', () => authModal.showModal());
            }
        }
    } catch (err) {
        console.error("Gagal setup navbar:", err);
        navUI.innerHTML = `<ul class="nav-links"><li><a id="login-nav-btn">Login/Register</a></li></ul>`;
        if(document.getElementById('login-nav-btn')) document.getElementById('login-nav-btn').addEventListener('click', () => authModal.showModal());
    }
}

function setupHomepage() {
    fetchTestimonials();
    document.getElementById('prev-slide').addEventListener('click', () => changeTestimonialSlide(-1));
    document.getElementById('next-slide').addEventListener('click', () => changeTestimonialSlide(1));
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    const authModal = document.getElementById('auth-modal');
    authModal.addEventListener('click', (e) => { if (e.target === authModal) authModal.close(); });
    const loginLinkFromTestimonial = document.getElementById('login-from-testimonial');
    if(loginLinkFromTestimonial) loginLinkFromTestimonial.addEventListener('click', (e) => { e.preventDefault(); authModal.showModal(); });
}

async function setupSubscriptionPage() {
    const authGate = document.getElementById('auth-gate');
    const subContent = document.getElementById('subscription-content');
    
    const authRes = await fetch(`${API_BASE_URL}/auth/check`, { credentials: 'include' });
    const authData = await authRes.json();
    
    if (authData.status === 'success') {
        document.getElementById('sub-name').value = authData.user.name;
        subContent.style.display = 'block';
        const subscriptionForm = document.getElementById('subscription-form');
        subscriptionForm.addEventListener('change', calculatePrice);
        subscriptionForm.addEventListener('submit', handleSubscription);
    } else {
        authGate.style.display = 'block';
        subContent.style.display = 'none';
    }
}

async function setupUserDashboardPage() { /* ... kode dari jawaban sebelumnya ... */ }
async function setupAdminDashboardPage() { /* ... kode dari jawaban sebelumnya ... */ }

// --- FUNGSI-FUNGSI HELPER DAN EVENT HANDLER LAINNYA ---
function toggleAuthView(showLogin) { /* ... */ }
function escapeHTML(str) { /* ... */ }
// ...dan semua fungsi lainnya dari file main.js Anda sebelumnya. Salin ke sini.

// Pastikan untuk menyalin semua fungsi-fungsi dari jawaban sebelumnya ke sini
// seperti: handleLogin, handleRegister, handleLogout, handleSubscription,
// calculatePrice, fetchTestimonials, populateTestimonials, dll.
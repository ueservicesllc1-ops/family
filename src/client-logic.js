import { auth, googleProvider, signInWithPopup, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, db, doc, setDoc, getDoc } from './config/firebase-config.js';

// DOM Elements
const authButtons = document.getElementById('auth-buttons');
const userMenu = document.getElementById('user-menu');
const authModal = document.getElementById('auth-modal');

// --- Auth State ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        console.log('User signed in:', user.email);
        ensureUserDoc(user); // Double check doc exists
    } else {
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
});

// --- Modal Logic ---
window.openAuthModal = () => {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('active');
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
};

window.switchAuthTab = (tab) => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(t => t.classList.remove('active'));

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabs[0].classList.add('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabs[1].classList.add('active');
    }
};

// --- Form Handlers ---

// Google Login
document.getElementById('auth-google-btn').addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Ensure user doc exists in Firestore
        await ensureUserDoc(user);

        closeModal('auth-modal');
        // Redirect if needed? Or just show logged in state
        // window.location.href = '/user/';
    } catch (error) {
        alert('Error con Google: ' + error.message);
    }
});

// Email Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        closeModal('auth-modal');
    } catch (error) {
        alert('Error Login: ' + error.message);
    }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Create user document with extra data
        await ensureUserDoc(user, { fullName: name });

        closeModal('auth-modal');
        alert('¡Cuenta creada! Revisa tu correo.');
    } catch (error) {
        alert('Error Registro: ' + error.message);
    }
});

// Helper: Create User Doc if not exists
async function ensureUserDoc(user, additionalData = {}) {
    const userRef = doc(db, 'clients_web', user.uid); // Separate collection for web users? Or use 'clients'?
    // Let's use 'clients_web' for now to avoid conflict with admin managed clients, 
    // OR use 'clients' but with a flag.
    // The requirement says: "fill their correct data name surname..."
    // So we just create a stub.

    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await setDoc(userRef, {
            email: user.email,
            fullName: user.displayName || additionalData.fullName || '',
            photoUrl: user.photoURL || '',
            createdAt: new Date(),
            role: 'client',
            // Generate a virtual locker ID (Suite)
            suiteId: 'FE-' + Math.floor(10000 + Math.random() * 90000)
        });
    }
}

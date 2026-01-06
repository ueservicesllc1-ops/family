import { auth, googleProvider, signInWithPopup, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, db, doc, setDoc, getDoc, query, orderBy, collection, getDocs } from './config/firebase-config.js';

// DOM Elements
const authButtons = document.getElementById('auth-buttons');
const userMenu = document.getElementById('user-menu');
const authModal = document.getElementById('auth-modal');

// --- Auth State ---
// Auth State Helper
let isUserLoggedIn = false;

onAuthStateChanged(auth, (user) => {
    isUserLoggedIn = !!user;
    if (user) {
        document.getElementById('auth-buttons').classList.add('hidden');
        document.getElementById('user-menu').classList.remove('hidden');

        // Update header info
        const displayname = user.displayName ? user.displayName.split(' ')[0] : 'Usuario';
        document.getElementById('header-username').textContent = displayname;
        if (user.photoURL) {
            document.getElementById('header-avatar').src = user.photoURL;
        }

        console.log('User signed in:', user.email);
        ensureUserDoc(user);
    } else {
        document.getElementById('auth-buttons').classList.remove('hidden');
        document.getElementById('user-menu').classList.add('hidden');

        // Hide admin icons
        document.getElementById('admin-link-gestion').classList.add('hidden');
        document.getElementById('admin-link-design').classList.add('hidden');
    }
});

window.handleStartAction = () => {
    if (isUserLoggedIn) {
        window.location.href = '/user/';
    } else {
        const modal = document.getElementById('how-it-works-modal');
        if (modal) modal.classList.add('active');
        else openAuthModal(); // Fallback
    }
};

window.openAuthFromHowTo = () => {
    closeModal('how-it-works-modal');
    openAuthModal();
}

// Logout
window.logoutApp = async () => {
    try {
        await auth.signOut();
        window.location.reload();
    } catch (error) {
        console.error('Logout error', error);
    }
};

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
    // Check for admin
    const ADMIN_EMAIL = 'ueservicesllc1@gmail.com';
    if (user.email === ADMIN_EMAIL) {
        document.getElementById('admin-link-gestion').classList.remove('hidden');
        document.getElementById('admin-link-design').classList.remove('hidden');
    }

    const userRef = doc(db, 'clients_web', user.uid);

    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await setDoc(userRef, {
            email: user.email,
            fullName: user.displayName || additionalData.fullName || '',
            photoUrl: user.photoURL || '',
            createdAt: new Date(),
            role: user.email === ADMIN_EMAIL ? 'admin' : 'client',
            suiteId: 'FE-' + Math.floor(10000 + Math.random() * 90000)
        });
    } else {
        // If user already exists, simple role check from DB could happen here
        // For now, email check is the master key as requested
    }
}

// --- PIN Logic ---
let targetAdminUrl = '';

window.requestPin = (url) => {
    targetAdminUrl = url;
    const modal = document.getElementById('pin-modal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('admin-pin').value = '';
        setTimeout(() => document.getElementById('admin-pin').focus(), 100);
    }
};

document.getElementById('pin-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = document.getElementById('admin-pin').value;

    // TODO: Verify PIN against DB or Config
    // Hardcoded for initial setup demonstration
    if (pin === '1619') {
        window.location.href = targetAdminUrl;
    } else {
        alert('PIN Incorrecto');
        document.getElementById('admin-pin').value = '';
    }
});

// --- Dynamic Banners & Carousel Logic ---

let slideIndex = 0;
let carouselInterval;

async function loadBanners() {
    const container = document.querySelector('.carousel-container');
    if (!container) return; // Not on landing page

    try {
        console.log('Cargando banners dinámicos...');
        let querySnapshot;

        // Try ordered query first
        try {
            const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
            querySnapshot = await getDocs(q);
        } catch (err) {
            console.warn('Error con query ordenado (posible falta de índice), intentando sin orden:', err);
            // Fallback to unordered
            const q = query(collection(db, 'banners'));
            querySnapshot = await getDocs(q);
        }

        if (!querySnapshot.empty) {
            console.log(`Encontrados ${querySnapshot.size} banners dinámicos.`);

            // clear static slides ONLY if we have dynamic ones
            const oldSlides = document.querySelectorAll('.carousel-slide');
            oldSlides.forEach(s => s.remove());

            const dotsContainer = document.querySelector('.carousel-dots');
            if (dotsContainer) dotsContainer.innerHTML = '';

            let i = 0;
            querySnapshot.forEach((doc) => {
                const banner = doc.data();
                console.log('Renderizando banner:', banner.title, banner.imageUrl);

                // Create Slide
                const slide = document.createElement('div');
                slide.className = `carousel-slide ${i === 0 ? 'active' : ''}`;
                // Use inline style for background, ensuring URL is safe
                slide.style.backgroundImage = `url('${banner.imageUrl}')`;

                slide.innerHTML = `
                    <div class="container slide-content">
                        <h1 class="animate-fade-up">${banner.title}</h1>
                        <p class="animate-fade-up" style="animation-delay: 0.1s">${banner.subtitle}</p>
                        ${banner.btnText ? `<a href="${banner.btnLink || '#'}" class="btn btn-primary animate-fade-up" style="animation-delay: 0.2s">${banner.btnText}</a>` : ''}
                    </div>
                `;

                // Find where to insert (before the first button controls)
                const controls = container.querySelector('.carousel-btn');
                if (controls) {
                    container.insertBefore(slide, controls);
                } else {
                    container.appendChild(slide);
                }

                // Create Dot
                if (dotsContainer) {
                    const dot = document.createElement('span');
                    dot.className = `dot ${i === 0 ? 'active' : ''} `;
                    let index = i;
                    dot.addEventListener('click', () => currentSlide(index));
                    dotsContainer.appendChild(dot);
                }
                i++;
            });
        } else {
            console.log('No se encontraron banners dinámicos, usando estáticos.');
        }
    } catch (e) {
        console.error("Error loading banners fatal:", e);
        // Fallback: existing static slides remain
    }

    // Start Carousel regardless of static or dynamic
    startCarousel();
}

function startCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;

    // Make functions available globally for HTML controls if needed, 
    // or attach listeners dynamically to .carousel-btn
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');

    if (prevBtn) prevBtn.onclick = () => moveSlide(-1);
    if (nextBtn) nextBtn.onclick = () => moveSlide(1);

    // Auto play
    if (carouselInterval) clearInterval(carouselInterval);
    carouselInterval = setInterval(() => {
        moveSlide(1);
    }, 5000);
}

window.moveSlide = (n) => {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;

    slideIndex += n;
    if (slideIndex >= slides.length) slideIndex = 0;
    if (slideIndex < 0) slideIndex = slides.length - 1;

    updateCarouselUI(slides, dots);
};

window.currentSlide = (n) => {
    slideIndex = n;
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    updateCarouselUI(slides, dots);
};

function updateCarouselUI(slides, dots) {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    if (slides[slideIndex]) slides[slideIndex].classList.add('active');
    if (dots[slideIndex]) dots[slideIndex].classList.add('active');
}

// --- Marquee Logic ---
async function loadMarquee() {
    const marqueeContainer = document.querySelector('.marquee-content');
    if (!marqueeContainer) return;

    // Defaults
    const defaults = [
        { text: "Para programar la recogida de tu paquete escribir en el chat en la esquina inferior derecha", icon: "fa-solid fa-bullhorn" },
        { text: "Oferta para envíos de más de 10 paquetes", icon: "fa-solid fa-gift" }
    ];

    try {
        const q = query(collection(db, 'marquee_messages'), orderBy('createdAt', 'desc'));

        onSnapshot(q, (snapshot) => {
            let messages = [];

            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    messages.push(doc.data());
                });
            } else {
                messages = defaults;
            }

            // Build HTML
            const html = messages.map(msg =>
                `<i class="${msg.icon || 'fa-solid fa-bullhorn'}"></i> ${msg.text}`
            ).join(' &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; ');

            // Duplicate content for smooth infinite scroll if short
            marqueeContainer.innerHTML = html + ' &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; ' + html;
        });

    } catch (e) {
        console.warn("Error loading marquee from DB, using defaults", e);
        // Fallback static
        const html = defaults.map(msg =>
            `<i class="${msg.icon}"></i> ${msg.text}`
        ).join(' &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; ');
        marqueeContainer.innerHTML = html;
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadBanners();
    loadMarquee();
});
loadBanners(); // Call immediately in case DOM is ready (module)
loadMarquee();

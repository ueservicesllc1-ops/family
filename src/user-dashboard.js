import { auth, db, onAuthStateChanged, signOut, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp } from './config/firebase-config.js';
import { uploadToB2 } from './config/b2-config.js';

// Elements
const sidebarName = document.getElementById('sidebar-name');
const sidebarSuite = document.getElementById('sidebar-suite');
const logoutBtn = document.getElementById('logout-btn');

const addrName = document.getElementById('addr-name');
const addrSuite = document.getElementById('addr-suite');

const profileForm = document.getElementById('profile-form');
const alertForm = document.getElementById('alert-form');

let currentUser = null;
let userDocData = null;

// Auth Check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/'; // Redirect to landing
        return;
    }
    currentUser = user;
    await loadUserProfile(user.uid);
    listenToAlerts(user.uid);
    listenToReceivedPackages(user.uid);
});

// Logout
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '/';
});

// Load Profile
async function loadUserProfile(uid) {
    try {
        const userRef = doc(db, 'clients_web', uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            userDocData = snap.data();
            updateUI(userDocData);
            populateProfileForm(userDocData);
        } else {
            // Handle case where auth account exists but doc is missing
            console.log('User doc not found, creating one...');
            await setDoc(userRef, {
                email: currentUser.email,
                fullName: currentUser.displayName || '',
                photoUrl: currentUser.photoURL || '',
                createdAt: serverTimestamp(),
                role: 'client',
                suiteId: 'FE-' + Math.floor(10000 + Math.random() * 90000)
            });
            // Recursively load
            loadUserProfile(uid);
        }
    } catch (e) {
        console.error('Error loading profile:', e);
    }
}

function updateUI(data) {
    sidebarName.textContent = data.fullName || 'Usuario';

    // Suite ID logic
    const suite = data.suiteId || 'PENDING';
    sidebarSuite.textContent = `Suite: ${suite}`;

    addrName.textContent = (data.fullName || 'TU NOMBRE').toUpperCase();
    addrSuite.innerHTML = `Suite: <strong style="color: #0284c7;">${suite}</strong>`;
}

function populateProfileForm(data) {
    // Split full name if possible
    const names = (data.fullName || '').split(' ');
    const name = names[0] || '';
    const surname = names.slice(1).join(' ') || '';

    document.getElementById('prof-name').value = name;
    document.getElementById('prof-surname').value = surname;
    document.getElementById('prof-email').value = data.email || currentUser.email;
    document.getElementById('prof-phone').value = data.phone || '';
    document.getElementById('prof-province').value = data.province || '';
    document.getElementById('prof-city').value = data.city || '';
    document.getElementById('prof-address').value = data.address || '';
}

// Save Profile
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const fullName = `${document.getElementById('prof-name').value} ${document.getElementById('prof-surname').value}`.trim();

        const updateData = {
            fullName: fullName,
            phone: document.getElementById('prof-phone').value,
            province: document.getElementById('prof-province').value,
            city: document.getElementById('prof-city').value,
            address: document.getElementById('prof-address').value
        };

        await updateDoc(doc(db, 'clients_web', currentUser.uid), updateData);

        // Update local UI
        userDocData = { ...userDocData, ...updateData };
        updateUI(userDocData);

        alert('Datos actualizados correctamente');
    } catch (error) {
        console.error(error);
        alert('Error al guardar: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar Cambios';
    }
});

// File Input Handler
document.getElementById('alert-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('file-name').textContent = `Archivo seleccionado: ${file.name}`;
    }
});

// Save Pre-alert
alertForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('alert-submit-btn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = 'Subiendo...';

    try {
        const fileInput = document.getElementById('alert-file');
        const file = fileInput.files[0];
        let invoiceUrl = '';

        if (file) {
            invoiceUrl = await uploadToB2(file, 'invoice-' + currentUser.uid);
        }

        const alertData = {
            userId: currentUser.uid,
            userName: userDocData.fullName,
            suiteId: userDocData.suiteId,
            store: document.getElementById('alert-store').value,
            trackingCode: document.getElementById('alert-tracking').value,
            contentDescription: document.getElementById('alert-content').value,
            invoiceUrl: invoiceUrl,
            status: 'pending', // pending, received, processed
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'pre_alerts'), alertData);

        alert('¡Alerta enviada exitosamente!');
        alertForm.reset();
        document.getElementById('file-name').textContent = '';

        // Show alerts section
        window.showSection('driver'); // Oh wait, switch? No, just keep simple.
    } catch (error) {
        console.error(error);
        alert('Error al enviar alerta: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// Listen to Alerts
function listenToAlerts(uid) {
    const q = query(collection(db, 'pre_alerts'), where('userId', '==', uid));

    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('alerts-list');
        if (snapshot.empty) {
            container.innerHTML = '<div class="text-muted p-3 bg-white border rounded">No tienes alertas registradas.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Reciente';

            html += `
            <div class="card p-3 mb-2 flex justify-between items-center" style="padding: 1rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: bold; color: #0284c7;">${data.trackingCode}</div>
                    <div class="text-sm text-secondary">${data.store} - ${data.contentDescription}</div>
                    <div class="text-xs text-muted">${date}</div>
                </div>
                <div class="text-right">
                    <span class="badge" style="background: #e2e8f0; padding: 0.25rem 0.5rem; border-radius: 999px; font-size: 0.8rem;">${data.status.toUpperCase()}</span>
                    ${data.invoiceUrl ? `<a href="${data.invoiceUrl}" target="_blank" style="display:block; font-size: 0.8rem; margin-top: 0.25rem; color: #0284c7;">Ver Factura</a>` : ''}
                </div>
            </div>
            `;
        });
        container.innerHTML = html;
    });
}

// Listen to Received Packages (Shipments)
function listenToReceivedPackages(uid) {
    // Note: This assumes 'shipments' collection has a 'clientId' field that matches the auth uid.
    // If the admin app uses a different ID system for clients, we might need to link them.
    // However, in step 114 (client-logic.js), we created a user doc with the AUTH UID.
    // If the admin creates a shipment, they select a client. 
    // To make this work seamlessly, the ADMIN app needs to know about this WEB client.
    // Creating a shipment requires a clientId. 
    // For now, we query by 'clientId' assuming it matches the UID. 
    // OR we query by email if clientId is different.

    // Let's try querying by clientId first.
    const q = query(collection(db, 'shipments'), where('clientId', '==', uid));

    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('received-list');
        if (snapshot.empty) {
            container.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: #94a3b8;">No se han encontrado paquetes recibidos.</td></tr>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : '-';
            const value = data.packageContent?.declaredValue || 0;
            const content = data.packageContent?.description || 'Paquete';

            // Status Badge Logic
            let statusColor = '#e2e8f0'; // Default gray
            let statusText = '#475569';
            if (data.status === 'received') { statusColor = '#dcfce7'; statusText = '#166534'; } // Green
            if (data.status === 'transit') { statusColor = '#dbeafe'; statusText = '#1e40af'; } // Blue
            if (data.status === 'delivering') { statusColor = '#fef9c3'; statusText = '#854d0e'; } // Yellow

            html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 1rem; font-weight: 600; color: #0f172a;">${data.trackingCode}</td>
                <td style="padding: 1rem;">${data.recipientName || 'Yo'}</td>
                <td style="padding: 1rem; color: #64748b;">${content}</td>
                <td style="padding: 1rem;">$${value}</td>
                <td style="padding: 1rem;">
                    <span style="background: ${statusColor}; color: ${statusText}; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                        ${data.status}
                    </span>
                </td>
                <td style="padding: 1rem; color: #64748b; font-size: 0.9rem;">${date}</td>
            </tr>
            `;
        });
        container.innerHTML = html;
    });
}

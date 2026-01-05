import { db, collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where, orderBy } from '../config/firebase-config.js';
import { uploadToB2 } from '../config/b2-config.js';

class LockerManager {
    constructor() {
        // State
        this.currentLockerUser = null;
    }

    // Get all registered web clients
    async getAllLockers() {
        try {
            const querySnapshot = await getDocs(collection(db, 'clients_web'));
            const lockers = [];
            querySnapshot.forEach((doc) => {
                lockers.push({ id: doc.id, ...doc.data() });
            });
            return lockers;
        } catch (error) {
            console.error('Error getting lockers:', error);
            throw error;
        }
    }

    // Render Grid of Lockers
    async renderLockersGrid() {
        const container = document.getElementById('lockers-grid');
        if (!container) return;

        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Cargando...</div>';

        try {
            const lockers = await this.getAllLockers();

            if (lockers.length === 0) {
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #64748b;">No hay usuarios registrados aún.</div>';
                return;
            }

            container.innerHTML = lockers.map(user => `
                <div class="card locker-card" style="cursor: pointer; transition: transform 0.2s;" onclick="window.viewLockerDetail('${user.id}')">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="width: 50px; height: 50px; background: #e0f2fe; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            ${user.photoUrl ? `<img src="${user.photoUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : '👤'}
                        </div>
                        <div>
                            <h3 style="font-size: 1.1rem; margin: 0; color: #0f172a;">${user.fullName || 'Sin Nombre'}</h3>
                            <div style="font-size: 0.85rem; color: #64748b;">${user.email}</div>
                        </div>
                    </div>
                    <div style="background: #f8fafc; padding: 0.75rem; border-radius: 0.5rem; text-align: center;">
                        <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">Casillero (Suite)</div>
                        <div style="font-size: 1.25rem; font-weight: 800; color: #0284c7;">${user.suiteId || 'PENDING'}</div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            container.innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
        }
    }

    // View specific locker detail
    async viewLockerDetail(userId) {
        // Switch view
        document.getElementById('lockers-page').classList.add('hidden');
        document.getElementById('locker-detail-page').classList.remove('hidden');

        // Fetch User Data
        try {
            const docRef = doc(db, 'clients_web', userId);
            // We could cache this but fetching fresh is safer
            // Wait we are inside a module, we can define getDoc here or pass user obj
            // Simpler to just re-fetch or use what we have if we passed it.
            // Let's assume we fetch fresh to get alerts.

            // Actually get user from cache or list? Iterate to find?
            // Let's just fetch doc
            // Implementation of getDoc needed
            const { getDoc } = await import('../config/firebase-config.js');
            const userSnap = await getDoc(docRef);

            if (userSnap.exists()) {
                const user = { id: userSnap.id, ...userSnap.data() };
                this.currentLockerUser = user;

                // Update UI Header
                document.getElementById('locker-user-name').textContent = user.fullName;
                document.getElementById('locker-suite-id').textContent = `Suite: ${user.suiteId}`;

                // Get Alerts
                this.renderLockerAlerts(userId);
            }
        } catch (error) {
            console.error(error);
            alert('Error cargando detalles');
        }
    }

    async renderLockerAlerts(userId) {
        const tbody = document.getElementById('locker-alerts-body');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando paquetes...</td></tr>';

        try {
            const q = query(collection(db, 'pre_alerts'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay paquetes reportados.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            snapshot.forEach(docSnap => {
                const alert = { id: docSnap.id, ...docSnap.data() };
                const row = document.createElement('tr');

                let actionBtn = '';
                if (alert.status === 'pending') {
                    actionBtn = `<button class="btn btn-sm btn-primary" onclick="window.openProcessAlertModal('${alert.id}', '${alert.trackingCode}')">Recibir / Procesar</button>`;
                } else {
                    actionBtn = `<span class="badge badge-success">Recibido</span>`;
                }

                row.innerHTML = `
                    <td><strong>${alert.trackingCode}</strong></td>
                    <td>
                        <div>${alert.store}</div>
                        <small class="text-muted">${alert.contentDescription}</small>
                    </td>
                    <td>
                        ${alert.invoiceUrl ? `<a href="${alert.invoiceUrl}" target="_blank" class="btn btn-sm btn-outline">Ver Factura</a>` : '<span class="text-muted">-</span>'}
                    </td>
                    <td><span class="badge badge-${alert.status === 'pending' ? 'warning' : 'success'}">${alert.status.toUpperCase()}</span></td>
                    <td>${actionBtn}</td>
                `;
                tbody.appendChild(row);
            });

        } catch (error) {
            console.error(error);
            tbody.innerHTML = `<tr><td colspan="5" style="color:red">Error: ${error.message}</td></tr>`;
        }
    }

    // Process Alert (Receive Package)
    async processAlert(formData) {
        // 1. Upload Photo to B2
        const photoUrl = await uploadToB2(formData.photoFile, `received-${formData.trackingCode}`);

        // 2. Update Alert Status in 'pre_alerts'
        const alertRef = doc(db, 'pre_alerts', formData.alertId);
        await updateDoc(alertRef, {
            status: 'received',
            receivedAt: serverTimestamp(),
            weight: formData.weight,
            dimensions: formData.dimensions,
            receivedPhotoUrl: photoUrl
        });

        // 3. Create Shipment Record in 'shipments' collection 
        // (So it appears in "Paquetes Recibidos" for the user and in "Envíos" for admin)
        // We need to map the data correctly.

        const shipmentData = {
            clientId: this.currentLockerUser.id, // The Web Client UID
            clientName: this.currentLockerUser.fullName,
            alertId: formData.alertId,
            trackingCode: formData.trackingCode, // Maintain the original tracking? Or generate new internal? Usually original for user ref.
            // Let's stick to original tracking for now, or maybe store both.
            // Admin app usually generates a FE-XXXX code.
            // Let's use the external tracking as reference but maybe generate internal ID too?
            // User requested: "al usuario le sale que ese paquete ya lo tenemos"

            category: 'B', // Default 4x4? Needs logic.
            status: 'received',
            createdAt: serverTimestamp(),

            // Package Details
            packageContent: {
                description: 'Paquete de ' + formData.trackingCode, // We should probably fetch the alert description
                declaredValue: 0, // Admin needs to set this later or get from invoice?
                weight: formData.weight
            },

            // Cost (placeholder)
            costs: {
                total: 0
            },

            receivedPhotoUrl: photoUrl
        };

        await addDoc(collection(db, 'shipments'), shipmentData);

        return true;
    }
}

export default new LockerManager();

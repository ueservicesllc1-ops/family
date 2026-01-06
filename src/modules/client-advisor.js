import { db, collection, getDocs } from '../config/firebase-config.js';
import clientManager from './client-manager.js';
import shipmentManager from './shipment-manager.js';

// Init
document.addEventListener('DOMContentLoaded', () => {
    // We could defer loading until the tab is clicked, but loading on start is fine for now
    loadClients();
});

// Load Clients into Table
async function loadClients() {
    const tableBody = document.getElementById('clients-table-body');
    if (!tableBody) return; // Might not exist yet if HTML update fails

    tableBody.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center;">Cargando clientes...</td></tr>';

    try {
        // Fetch clients using Manager
        const clients = await clientManager.getAllClients();

        tableBody.innerHTML = '';

        if (clients.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center;">No hay clientes registrados.</td></tr>';
            return;
        }

        clients.forEach(client => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:1rem; border-bottom:1px solid #f1f5f9;">
                    <div style="font-weight:600; color:#0f172a;">${client.fullName || 'Sin Nombre'}</div>
                </td>
                <td style="padding:1rem; border-bottom:1px solid #f1f5f9;">${client.email || '-'}</td>
                <td style="padding:1rem; border-bottom:1px solid #f1f5f9;">${client.phone || '-'}</td>
                <td style="padding:1rem; border-bottom:1px solid #f1f5f9;">
                    <button onclick="viewClientDetails('${client.id}')" style="background:#e0f2fe; color:#0369a1; border:none; padding:5px 10px; border-radius:6px; cursor:pointer; font-weight:600; margin-right:5px;">
                        <i class="fa-solid fa-address-card"></i> Detalles
                    </button>
                    <button onclick="viewClientHistory('${client.id}')" style="background:#f1f5f9; color:#475569; border:none; padding:5px 10px; border-radius:6px; cursor:pointer; font-weight:600;">
                        <i class="fa-solid fa-clock-rotate-left"></i> Historial
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (e) {
        console.error('Error loading clients:', e);
        tableBody.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:red;">Error al cargar clientes.</td></tr>';
    }
}

// Global function to View Details
window.viewClientDetails = async (clientId) => {
    const modal = document.getElementById('modal-details');
    const content = document.getElementById('details-content');
    const familyList = document.getElementById('family-list');

    if (!modal) return;

    // Show spinner
    modal.style.display = 'flex';
    content.innerHTML = '<p>Cargando...</p>';
    familyList.innerHTML = '';

    try {
        const client = await clientManager.getClientById(clientId);
        if (!client) {
            content.innerHTML = '<p style="color:red;">Cliente no encontrado</p>';
            return;
        }

        content.innerHTML = `
            <div class="info-grid">
                <div>
                    <div class="info-label">Nombre Completo</div>
                    <div class="info-value">${client.fullName}</div>
                </div>
                <div>
                    <div class="info-label">Teléfono</div>
                    <div class="info-value">${client.phone}</div>
                </div>
                <div>
                    <div class="info-label">Email</div>
                    <div class="info-value">${client.email || '-'}</div>
                </div>
                <div>
                    <div class="info-label">Dirección</div>
                    <div class="info-value">${client.address || '-'}</div>
                </div>
                 <div>
                    <div class="info-label">ID / Cédula</div>
                    <div class="info-value">${client.idNumber || '-'}</div>
                </div>
                 <div>
                    <div class="info-label">Categoría</div>
                    <div class="info-value text-uppercase">${client.category || 'B'}</div>
                </div>
            </div>
        `;

        // Family Members
        const familyMembers = client.consularRegistration?.familyMembers || [];
        if (familyMembers.length === 0) {
            familyList.innerHTML = '<p style="color:#94a3b8; font-style:italic;">No hay familiares registrados.</p>';
        } else {
            familyMembers.forEach(fam => {
                const div = document.createElement('div');
                div.style.padding = '10px';
                div.style.borderBottom = '1px solid #e2e8f0';
                div.innerHTML = `
                    <strong>${fam.name}</strong> - <small>${fam.relationship}</small><br>
                    <small style="color:#64748b;">ID: ${fam.ecuadorianId}</small>
                    ${fam.photoUrlFront ? `<br><a href="${fam.photoUrlFront}" target="_blank" style="font-size:0.8rem; color:#0ea5e9; text-decoration:none;">📷 Frente</a>` : ''}
                    ${fam.photoUrlBack ? `<span style="color:#cbd5e1; margin:0 4px;">|</span><a href="${fam.photoUrlBack}" target="_blank" style="font-size:0.8rem; color:#0ea5e9; text-decoration:none;">📷 Reverso</a>` : ''}
                    ${(!fam.photoUrlFront && fam.photoUrl) ? `<br><a href="${fam.photoUrl}" target="_blank" style="font-size:0.8rem; color:#0ea5e9; text-decoration:none;">📷 Ver Cédula</a>` : ''}
                `;
                familyList.appendChild(div);
            });
        }

    } catch (e) {
        console.error(e);
        content.innerHTML = '<p style="color:red;">Error al cargar detalles</p>';
    }
};

// Global function to View History
window.viewClientHistory = async (clientId) => {
    const modal = document.getElementById('modal-history');
    const content = document.getElementById('history-content');

    if (!modal) return;

    modal.style.display = 'flex';
    content.innerHTML = '<p>Cargando historial...</p>';

    try {
        const shipments = await shipmentManager.getShipmentsByClient(clientId);

        if (shipments.length === 0) {
            content.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Este cliente no ha realizado envíos aún.</div>';
            return;
        }

        content.innerHTML = '';
        shipments.forEach(s => {
            const date = s.createdAt ? new Date(s.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
            const statusLabels = {
                'pending': '<span style="color:#d97706; background:#fef3c7; padding:2px 8px; border-radius:10px; font-size:0.8rem;">Pendiente</span>',
                'in_transit': '<span style="color:#0284c7; background:#e0f2fe; padding:2px 8px; border-radius:10px; font-size:0.8rem;">En Tránsito</span>',
                'delivered': '<span style="color:#16a34a; background:#dcfce7; padding:2px 8px; border-radius:10px; font-size:0.8rem;">Entregado</span>'
            };

            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div>
                    <div style="font-weight:700; color:#1e293b;">${s.trackingCode}</div>
                    <div style="font-size:0.85rem; color:#64748b;">${date} • Valor: $${s.packageContent.declaredValue}</div>
                </div>
                <div>
                    ${statusLabels[s.status] || '<span style="color:#64748b; background:#f1f5f9;">' + s.status + '</span>'}
                </div>
            `;
            content.appendChild(div);
        });

    } catch (e) {
        console.error(e);
        content.innerHTML = '<p style="color:red;">Error al cargar historial</p>';
    }
};

// Also expose loadClients in case we want to refresh manually
window.refreshClientList = loadClients;

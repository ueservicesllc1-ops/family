// Main Application Script - COMPLETE VERSION WITH ALL FEATURES
import authManager from './modules/auth.js';
import clientManager from './modules/client-manager.js';
import shipmentManager from './modules/shipment-manager.js';
import lockerManager from './modules/locker-manager.js';
import printManager from './modules/print-manager.js';
import costCalculator from './modules/cost-calculator.js';
import { PACKAGE_ITEMS } from './config/package-items-config.js';

// Global state
let currentPage = 'dashboard';
let currentClientId = null;
let currentShipmentId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Initialize authentication
    authManager.init();

    // Setup event listeners
    setupEventListeners();

    // Initialize package items in shipment form
    populatePackageItems();

    // Assign global functions for locker interaction (called from HTML onclick)
    window.viewLockerDetail = (uid) => lockerManager.viewLockerDetail(uid);
    window.openProcessAlertModal = (alertId, tracking) => {
        document.getElementById('process-alert-id').value = alertId;
        document.getElementById('process-tracking').value = tracking;
        // Need to set user ID? Current locker user is stored in manager.
        document.getElementById('process-alert-modal').classList.add('active');
    };

    // Add welcome animation
    console.log('%c🎉 Family Express System Loaded!', 'color: #6366f1; font-size: 20px; font-weight: bold;');
}

// Setup Event Listeners
function setupEventListeners() {
    // Login button
    document.getElementById('google-login-btn')?.addEventListener('click', handleLogin);

    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.currentTarget.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // Client management
    document.getElementById('add-client-btn')?.addEventListener('click', () => openClientModal());
    document.getElementById('client-form')?.addEventListener('submit', handleClientSubmit);
    document.getElementById('client-search')?.addEventListener('input', handleClientSearch);

    // Family member management
    document.getElementById('family-member-form')?.addEventListener('submit', handleFamilyMemberSubmit);

    // Shipment management
    document.getElementById('add-shipment-btn')?.addEventListener('click', () => openShipmentModal());
    document.getElementById('shipment-form')?.addEventListener('submit', handleShipmentSubmit);
    document.getElementById('shipment-status-filter')?.addEventListener('change', handleShipmentFilter);
    document.getElementById('shipment-client')?.addEventListener('change', loadRecipients);

    // Tracking
    document.getElementById('tracking-search-btn')?.addEventListener('click', handleTrackingSearch);

    // Reports
    document.getElementById('generate-report-btn')?.addEventListener('click', handleGenerateReport);

    // Process Alert (Locker)
    document.getElementById('process-alert-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const spinner = document.getElementById('process-submit-spinner');
        const text = document.getElementById('process-submit-text');

        btn.disabled = true;
        spinner.classList.remove('hidden');
        text.textContent = 'Procesando...';

        try {
            const formData = {
                alertId: document.getElementById('process-alert-id').value,
                trackingCode: document.getElementById('process-tracking').value,
                weight: parseFloat(document.getElementById('process-weight').value),
                dimensions: document.getElementById('process-dimensions').value,
                photoFile: document.getElementById('process-photo').files[0]
            };

            await lockerManager.processAlert(formData);

            alert('Paquete procesado y registrado exitosamente.');
            closeModal('process-alert-modal');
            e.target.reset();

            // Refresh details
            if (lockerManager.currentLockerUser) {
                lockerManager.renderLockerAlerts(lockerManager.currentLockerUser.id);
            }
        } catch (error) {
            console.error(error);
            alert('Error al procesar: ' + error.message);
        } finally {
            btn.disabled = false;
            spinner.classList.add('hidden');
            text.textContent = 'Confirmar Recepción';
        }
    });

    // Category radio change
    document.querySelectorAll('input[name="client-category"]').forEach(radio => {
        radio.addEventListener('change', handleCategoryChange);
    });

    // Shipment value change for cost calculation
    document.getElementById('shipment-value')?.addEventListener('input', updateCostBreakdown);
    document.getElementById('shipment-client')?.addEventListener('change', updateCostBreakdown);

    // Auth state change
    authManager.onAuthChange((user) => {
        if (user) {
            showNotification('¡Bienvenido a Family Express!', 'success');
            loadDashboard();
        }
    });
}

// Authentication Handlers
async function handleLogin() {
    try {
        await authManager.signInWithGoogle();
    } catch (error) {
        showNotification('Error al iniciar sesión: ' + error.message, 'error');
    }
}

async function handleLogout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        try {
            await authManager.logout();
        } catch (error) {
            showNotification('Error al cerrar sesión: ' + error.message, 'error');
        }
    }
}

// Navigation
function navigateToPage(page) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.add('hidden');
    });

    // Show selected page
    document.getElementById(`${page}-page`)?.classList.remove('hidden');

    currentPage = page;

    // Load page data
    switch (page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'clients':
            loadClients();
            break;
        case 'shipments':
            loadShipments();
            break;
        case 'tracking':
            break;
        case 'reports':
            break;
        case 'lockers':
            lockerManager.renderLockersGrid();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        showLoading();

        const shipments = await shipmentManager.getAllShipments();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayShipments = shipments.filter(s => {
            const shipDate = s.createdAt.toDate();
            shipDate.setHours(0, 0, 0, 0);
            return shipDate.getTime() === today.getTime();
        });

        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        const weekShipments = shipments.filter(s => s.createdAt.toDate() >= weekStart);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthShipments = shipments.filter(s => s.createdAt.toDate() >= monthStart);

        const todayStats = shipmentManager.getStatistics(todayShipments);
        const weekStats = shipmentManager.getStatistics(weekShipments);
        const monthStats = shipmentManager.getStatistics(monthShipments);
        const totalStats = shipmentManager.getStatistics(shipments);

        renderStats({
            today: todayStats,
            week: weekStats,
            month: monthStats,
            total: totalStats
        });

        renderRecentShipments(shipments.slice(0, 10));

        hideLoading();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        hideLoading();
    }
}

function renderStats(stats) {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;

    statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">Envíos Hoy</span>
        <span class="stat-icon">📦</span>
      </div>
      <div class="stat-value">${stats.today.total}</div>
      <div class="stat-change">Ganancia: ${costCalculator.formatCurrency(stats.today.totalProfit)}</div>
    </div>
    
    <div class="stat-card success">
      <div class="stat-header">
        <span class="stat-label">Esta Semana</span>
        <span class="stat-icon">📈</span>
      </div>
      <div class="stat-value">${stats.week.total}</div>
      <div class="stat-change">Ganancia: ${costCalculator.formatCurrency(stats.week.totalProfit)}</div>
    </div>
    
    <div class="stat-card warning">
      <div class="stat-header">
        <span class="stat-label">Este Mes</span>
        <span class="stat-icon">📊</span>
      </div>
      <div class="stat-value">${stats.month.total}</div>
      <div class="stat-change">Ganancia: ${costCalculator.formatCurrency(stats.month.totalProfit)}</div>
    </div>
    
    <div class="stat-card danger">
      <div class="stat-header">
        <span class="stat-label">En Tránsito</span>
        <span class="stat-icon">🚚</span>
      </div>
      <div class="stat-value">${stats.total.inTransit || 0}</div>
      <div class="stat-change">Pendientes: ${stats.total.pending || 0}</div>
    </div>
  `;
}

function renderRecentShipments(shipments) {
    const container = document.getElementById('recent-shipments');
    if (!container) return;

    if (shipments.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><h3>No hay envíos recientes</h3></div>';
        return;
    }

    container.innerHTML = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Cliente</th>
            <th>Categoría</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${shipments.map(s => `
            <tr>
              <td><strong>${s.trackingCode}</strong></td>
              <td>${s.clientName}</td>
              <td><span class="badge badge-${s.category === 'B' ? 'warning' : 'success'}">Cat. ${s.category}</span></td>
              <td>${costCalculator.formatCurrency(s.costs.total)}</td>
              <td><span class="badge badge-${getStatusBadgeClass(s.status)}">${shipmentManager.getStatusLabel(s.status)}</span></td>
              <td>${formatDate(s.createdAt.toDate())}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Clients
async function loadClients() {
    try {
        showLoading();
        const clients = await clientManager.getAllClients();
        renderClientsTable(clients);
        hideLoading();
    } catch (error) {
        console.error('Error loading clients:', error);
        hideLoading();
    }
}

function renderClientsTable(clients) {
    const tbody = document.getElementById('clients-table-body');
    if (!tbody) return;

    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">👥</div><h3>No hay clientes registrados</h3></div></td></tr>';
        return;
    }

    tbody.innerHTML = clients.map(client => `
    <tr>
      <td>
        <div class="flex items-center gap-2">
          ${client.photoUrl ? `<img src="${client.photoUrl}" alt="${client.fullName}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">` : ''}
          <div>
            <strong>${client.fullName}</strong><br>
            <small style="color: var(--text-muted);">${client.idNumber}</small>
          </div>
        </div>
      </td>
      <td>${client.phone}</td>
      <td>${client.email || '-'}</td>
      <td><span class="badge badge-${client.category === 'B' ? 'warning' : 'success'}">Cat. ${client.category}</span></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewClientShipments('${client.id}')">Ver Envíos</button>
        <button class="btn btn-sm btn-secondary" onclick="editClient('${client.id}')">Editar</button>
        ${client.category === 'G' ? `<button class="btn btn-sm btn-success" onclick="openFamilyMemberModal('${client.id}')" style="margin-left:5px;">👨‍👩‍👧 Agregar Familiares</button>` : ''}
      </td>
    </tr>
  `).join('');
}

function handleClientSearch(e) {
    const searchTerm = e.target.value;
    const clients = clientManager.searchClients(searchTerm);
    renderClientsTable(clients);
}

// function openClientModal moved below

async function loadClientData(clientId) {
    try {
        const client = await clientManager.getClientById(clientId);
        if (client) {
            document.getElementById('client-fullname').value = client.fullName;
            document.getElementById('client-phone').value = client.phone;
            document.getElementById('client-email').value = client.email || '';
            document.getElementById('client-address').value = client.address;
            document.getElementById('client-idnumber').value = client.idNumber;
            document.querySelector(`input[name="client-category"][value="${client.category}"]`).checked = true;
            document.getElementById('client-registration').value = client.consularRegistration?.registrationNumber || '';

            if (client.category === 'G') {
                document.getElementById('consular-section').classList.remove('hidden');

                // Show family members logic
                const container = document.getElementById('client-family-list');
                if (container) {
                    const members = client.consularRegistration?.familyMembers || [];
                    let html = '<label class="form-label" style="margin-top:15px; display:block;">Familiares Registrados</label>';

                    if (members.length === 0) {
                        html += '<p style="color:#64748b; font-size:0.9rem; margin-bottom:10px;">No hay familiares registrados.</p>';
                    } else {
                        html += '<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; margin-bottom:10px;">';
                        members.forEach(fm => {
                            html += `
                                <div style="padding:10px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <strong>${fm.name}</strong> <small>(${fm.relationship})</small><br>
                                        <small style="color:#64748b;">ID: ${fm.ecuadorianId}</small>
                                        ${fm.photoUrlFront ? `<br><a href="${fm.photoUrlFront}" target="_blank" style="font-size:0.8rem; color:#0ea5e9;">📷 Cédula (Frente)</a>` : ''}
                                        ${fm.photoUrlBack ? `<span style="margin:0 5px; color:#cbd5e1;">|</span><a href="${fm.photoUrlBack}" target="_blank" style="font-size:0.8rem; color:#0ea5e9;">📷 Cédula (Atrás)</a>` : ''}
                                        ${(!fm.photoUrlFront && fm.photoUrl) ? `<br><a href="${fm.photoUrl}" target="_blank" style="font-size:0.8rem; color:#0ea5e9;">📷 Ver Cédula</a>` : ''}
                                    </div>
                                    <button type="button" class="btn btn-sm btn-danger" onclick="deleteFamilyMember('${client.id}', '${fm.id}')" style="padding:2px 8px; font-size:0.8rem;">🗑️</button>
                                </div>
                             `;
                        });
                        html += '</div>';
                    }

                    html += `
                        <button type="button" class="btn btn-secondary btn-sm" onclick="openFamilyMemberModal('${client.id}')" style="width:100%; border:1px dashed #cbd5e1;">
                            + Agregar Familiar
                        </button>
                     `;

                    container.innerHTML = html;
                    container.classList.remove('hidden');
                }
            } else {
                if (document.getElementById('client-family-list')) {
                    document.getElementById('client-family-list').classList.add('hidden');
                }
            }
        }
    } catch (error) {
        console.error('Error loading client data:', error);
    }
}

async function handleClientSubmit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('[type="submit"]');
    const spinner = document.getElementById('client-submit-spinner');
    const text = document.getElementById('client-submit-text');

    submitBtn.disabled = true;
    spinner.classList.remove('hidden');
    text.textContent = 'Guardando...';

    try {
        const formData = {
            fullName: document.getElementById('client-fullname').value,
            phone: document.getElementById('client-phone').value,
            email: document.getElementById('client-email').value,
            address: document.getElementById('client-address').value,
            idNumber: document.getElementById('client-idnumber').value,
            category: document.querySelector('input[name="client-category"]:checked').value,
            registrationNumber: document.getElementById('client-registration').value
        };

        const validation = clientManager.validateClientData(formData);
        if (!validation.isValid) {
            showNotification('Errores:\n' + validation.errors.join('\n'), 'error');
            return;
        }

        const photoFile = document.getElementById('client-photo').files[0];

        if (currentClientId) {
            await clientManager.updateClient(currentClientId, formData, photoFile);
            showNotification('✅ Cliente actualizado exitosamente', 'success');
        } else {
            const client = await clientManager.createClient(formData, photoFile);
            showNotification('✅ Cliente creado exitosamente', 'success');

            // If Category G, ask to add family members
            if (client.category === 'G') {
                setTimeout(() => {
                    if (confirm('¿Desea agregar familiares en Ecuador ahora?')) {
                        currentClientId = client.id;
                        closeModal('client-modal');
                        document.getElementById('family-member-modal').classList.add('active');
                    }
                }, 500);
            }
        }

        closeModal('client-modal');
        loadClients();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
        text.textContent = 'Guardar Cliente';
    }
}

function handleCategoryChange(e) {
    const consularSection = document.getElementById('consular-section');
    const hint = document.getElementById('new-client-family-hint');

    if (e.target.value === 'G') {
        consularSection.classList.remove('hidden');
        // Show hint only if it's a new client
        if (!currentClientId && hint) {
            hint.classList.remove('hidden');
        } else if (hint) {
            hint.classList.add('hidden');
        }
    } else {
        consularSection.classList.add('hidden');
        if (hint) hint.classList.add('hidden');
    }
}

// Make sure to reset state when opening modal
function openClientModal(clientId = null) {
    currentClientId = clientId;
    const modal = document.getElementById('client-modal');
    const title = document.getElementById('client-modal-title');
    const hint = document.getElementById('new-client-family-hint');
    const familyList = document.getElementById('client-family-list');

    // Reset UI
    if (hint) hint.classList.add('hidden');
    if (familyList) familyList.classList.add('hidden');
    document.getElementById('consular-section').classList.add('hidden');

    if (clientId) {
        title.textContent = 'Editar Cliente';
        loadClientData(clientId);
    } else {
        title.textContent = 'Nuevo Cliente';
        document.getElementById('client-form').reset();
        // Reset category radios to B default
        document.querySelector('input[name="client-category"][value="B"]').checked = true;
    }

    modal.classList.add('active');
}

// Family Members Management
async function handleFamilyMemberSubmit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('[type="submit"]');
    const spinner = document.getElementById('fm-submit-spinner');
    const text = document.getElementById('fm-submit-text');

    submitBtn.disabled = true;
    spinner.classList.remove('hidden');
    text.textContent = 'Guardando...';

    try {
        const familyMemberData = {
            name: document.getElementById('fm-name').value,
            relationship: document.getElementById('fm-relationship').value,
            ecuadorianId: document.getElementById('fm-cedula').value,
            phone: document.getElementById('fm-phone').value,
            address: document.getElementById('fm-address').value,
            city: document.getElementById('fm-city').value,
            province: document.getElementById('fm-province').value
        };

        const validation = clientManager.validateFamilyMemberData(familyMemberData);
        if (!validation.isValid) {
            showNotification('Errores:\n' + validation.errors.join('\n'), 'error');
            return;
        }

        const photoFileFront = document.getElementById('fm-photo-front').files[0];
        const photoFileBack = document.getElementById('fm-photo-back').files[0];

        const photos = {
            front: photoFileFront,
            back: photoFileBack
        };

        await clientManager.addFamilyMember(currentClientId, familyMemberData, photos);
        showNotification('✅ Familiar agregado exitosamente', 'success');

        document.getElementById('family-member-form').reset();

        // Ask if wants to add more
        setTimeout(() => {
            if (!confirm('¿Desea agregar otro familiar?')) {
                closeModal('family-member-modal');
                // Re-open client modal to see update
                openClientModal(currentClientId);
            }
        }, 500);

        loadClients();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
        text.textContent = 'Guardar Familiar';
    }
}

// Shipments
async function loadShipments() {
    try {
        showLoading();
        const shipments = await shipmentManager.getAllShipments();
        renderShipmentsTable(shipments);

        const clients = await clientManager.getAllClients();
        populateClientDropdown(clients);

        hideLoading();
    } catch (error) {
        console.error('Error loading shipments:', error);
        hideLoading();
    }
}

function renderShipmentsTable(shipments) {
    const tbody = document.getElementById('shipments-table-body');
    if (!tbody) return;

    if (shipments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">📦</div><h3>No hay envíos registrados</h3></div></td></tr>';
        return;
    }

    tbody.innerHTML = shipments.map(shipment => `
    <tr>
      <td><strong>${shipment.trackingCode}</strong></td>
      <td>${shipment.clientName}</td>
      <td><span class="badge badge-${shipment.category === 'B' ? 'warning' : 'success'}">Cat. ${shipment.category}</span></td>
      <td>${costCalculator.formatCurrency(shipment.packageContent.declaredValue)}</td>
      <td>${costCalculator.formatCurrency(shipment.costs.total)}</td>
      <td><span class="badge badge-${getStatusBadgeClass(shipment.status)}">${shipmentManager.getStatusLabel(shipment.status)}</span></td>
      <td>${formatDate(shipment.createdAt.toDate())}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewShipmentDetail('${shipment.id}')">Ver</button>
        <button class="btn btn-sm btn-secondary" onclick="reprintLabels('${shipment.id}')">🖨️</button>
      </td>
    </tr>
  `).join('');
}

function handleShipmentFilter(e) {
    const status = e.target.value;
    const shipments = status ? shipmentManager.getShipmentsByStatus(status) : shipmentManager.shipments;
    renderShipmentsTable(shipments);
}

function populateClientDropdown(clients) {
    const select = document.getElementById('shipment-client');
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione un cliente...</option>' +
        clients.map(client => `
      <option value="${client.id}" data-category="${client.category}">${client.fullName} (Cat. ${client.category})</option>
    `).join('');
}

function populatePackageItems() {
    const container = document.getElementById('package-items');
    if (!container) return;

    container.innerHTML = PACKAGE_ITEMS.map(item => `
    <label class="checkbox-label">
      <input type="checkbox" name="package-item" value="${item.id}">
      <span>${item.icon} ${item.name}</span>
    </label>
  `).join('');
}

function openShipmentModal() {
    const modal = document.getElementById('shipment-modal');
    document.getElementById('shipment-form').reset();
    document.getElementById('cost-breakdown-container').classList.add('hidden');
    document.getElementById('recipient-section').classList.add('hidden');
    modal.classList.add('active');
}

async function loadRecipients() {
    const clientSelect = document.getElementById('shipment-client');
    const clientId = clientSelect.value;
    const recipientSection = document.getElementById('recipient-section');
    const recipientSelect = document.getElementById('recipient-select');

    if (!clientId) {
        recipientSection.classList.add('hidden');
        return;
    }

    recipientSection.classList.remove('hidden');

    try {
        const client = await clientManager.getClientById(clientId);
        const familyMembers = client.consularRegistration?.familyMembers || [];

        if (familyMembers.length > 0) {
            recipientSelect.innerHTML = '<option value="">Seleccione un familiar...</option>' +
                familyMembers.map(fm => `
          <option value="${fm.id}">${fm.name} - ${fm.city}, ${fm.province}</option>
        `).join('');

            // Default to first usually? No, force selection.
            document.getElementById('use-manual-recipient').checked = false;
            toggleRecipientInput();
        } else {
            recipientSelect.innerHTML = '<option value="">No hay familiares registrados</option>';
            document.getElementById('use-manual-recipient').checked = true;
            toggleRecipientInput();

            showNotification('ℹ️ Este cliente no tiene familiares registrados. Ingrese destinatario manualmente.', 'info');
        }
    } catch (error) {
        console.error('Error loading recipients:', error);
    }

    updateCostBreakdown();
}

// Make global for inline onchange
window.toggleRecipientInput = toggleRecipientInput;

// New Helper for Family Members
window.openFamilyMemberModal = (clientId) => {
    currentClientId = clientId;
    closeModal('client-modal');
    document.getElementById('family-member-modal').classList.add('active');
};

window.deleteFamilyMember = async (clientId, fmId) => {
    if (!confirm('¿Seguro que desea eliminar a este familiar?')) return;

    try {
        await clientManager.removeFamilyMember(clientId, fmId);
        // Refresh client modal
        loadClientData(clientId);
    } catch (e) {
        alert('Error: ' + e.message);
    }
};

function toggleRecipientInput() {
    const manual = document.getElementById('use-manual-recipient').checked;
    const selectContainer = document.getElementById('recipient-select-container');
    const manualContainer = document.getElementById('recipient-manual-container');

    if (manual) {
        selectContainer.classList.add('hidden');
        manualContainer.classList.remove('hidden');
    } else {
        selectContainer.classList.remove('hidden');
        manualContainer.classList.add('hidden');
    }
}

async function handleShipmentSubmit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('[type="submit"]');
    const spinner = document.getElementById('shipment-submit-spinner');
    const text = document.getElementById('shipment-submit-text');

    submitBtn.disabled = true;
    spinner.classList.remove('hidden');
    text.textContent = 'Procesando pago...';

    try {
        const clientSelect = document.getElementById('shipment-client');
        const selectedOption = clientSelect.options[clientSelect.selectedIndex];
        const clientId = clientSelect.value;

        const items = Array.from(document.querySelectorAll('input[name="package-item"]:checked'))
            .map(cb => cb.value);

        const recipientSelect = document.getElementById('recipient-select');
        const useManual = document.getElementById('use-manual-recipient').checked;

        let recipientData = {};

        if (useManual) {
            recipientData = {
                name: document.getElementById('recipient-name').value,
                phone: document.getElementById('recipient-phone').value,
                address: document.getElementById('recipient-address').value,
                city: document.getElementById('recipient-city').value,
                province: document.getElementById('recipient-province').value,
                idNumber: document.getElementById('recipient-id').value
            };
        } else if (recipientSelect && recipientSelect.value) {
            const client = await clientManager.getClientById(clientId);
            const familyMember = client.consularRegistration.familyMembers
                .find(fm => fm.id === recipientSelect.value);

            if (familyMember) {
                recipientData = {
                    name: familyMember.name,
                    phone: familyMember.phone,
                    address: familyMember.address,
                    city: familyMember.city,
                    province: familyMember.province,
                    idNumber: familyMember.ecuadorianId
                };
            }
        }

        const shipmentData = {
            clientId: clientId,
            clientName: selectedOption.text.split('(')[0].trim(),
            category: selectedOption.getAttribute('data-category'),
            items: items,
            declaredValue: document.getElementById('shipment-value').value,
            recipientName: recipientData.name,
            recipientPhone: recipientData.phone,
            recipientAddress: recipientData.address,
            recipientCity: recipientData.city,
            recipientProvince: recipientData.province,
            recipientId: recipientData.idNumber,
            paymentMethod: document.getElementById('payment-method').value || 'cash'
        };

        const validation = shipmentManager.validateShipmentData(shipmentData);
        if (!validation.isValid) {
            showNotification('Errores:\n' + validation.errors.join('\n'), 'error');
            return;
        }

        text.textContent = 'Creando envío...';
        const shipment = await shipmentManager.createShipment(shipmentData);
        const client = await clientManager.getClientById(clientId);

        playSuccessSound();

        const printChoice = confirm(
            `✅ ¡PAGO RECIBIDO!\n\n` +
            `💵 Total cobrado: $25.00\n` +
            `📦 Código: ${shipment.trackingCode}\n` +
            `📍 Destinatario: ${recipientData.name}\n` +
            `🏙️ Ciudad: ${recipientData.city}\n\n` +
            `¿Desea imprimir el RECIBO de pago?\n` +
            `(Si cancela, imprimirá solo la ETIQUETA)`
        );

        if (printChoice) {
            printManager.printReceipt(shipment, client);
            await shipmentManager.markReceiptPrinted(shipment.id);

            setTimeout(() => {
                if (confirm('✅ Recibo enviado a impresora.\n\n¿Desea imprimir también la ETIQUETA del paquete?')) {
                    printManager.printLabel(shipment, client);
                    shipmentManager.markLabelPrinted(shipment.id);
                }
            }, 800);
        } else {
            printManager.printLabel(shipment, client);
            await shipmentManager.markLabelPrinted(shipment.id);
        }

        showNotification(`✅ Envío ${shipment.trackingCode} creado exitosamente!`, 'success');

        closeModal('shipment-modal');
        loadShipments();
        if (currentPage === 'dashboard') {
            loadDashboard();
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
        text.textContent = '💵 Cobrar $25.00 y Crear Envío';
    }
}

function updateCostBreakdown() {
    const clientSelect = document.getElementById('shipment-client');
    const valueInput = document.getElementById('shipment-value');
    const container = document.getElementById('cost-breakdown-container');

    if (!clientSelect.value || !valueInput.value) {
        container.classList.add('hidden');
        return;
    }

    const selectedOption = clientSelect.options[clientSelect.selectedIndex];
    const category = selectedOption.getAttribute('data-category');
    const declaredValue = parseFloat(valueInput.value);

    if (declaredValue > 0) {
        const breakdown = costCalculator.getCostBreakdownHTML(category, declaredValue);
        container.innerHTML = breakdown;
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

// Tracking
async function handleTrackingSearch() {
    const trackingCode = document.getElementById('tracking-search').value.trim().toUpperCase();

    if (!trackingCode) {
        showNotification('Por favor ingrese un código de rastreo', 'warning');
        return;
    }

    try {
        showLoading();

        const shipment = await shipmentManager.getShipmentByTrackingCode(trackingCode);
        const history = await shipmentManager.getTrackingHistory(trackingCode);

        if (!shipment) {
            document.getElementById('tracking-results').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <h3>No se encontró el paquete</h3>
          <p>Código: ${trackingCode}</p>
        </div>
      `;
        } else {
            renderTrackingResults(shipment, history);
        }

        document.getElementById('tracking-results').classList.remove('hidden');
        hideLoading();
    } catch (error) {
        console.error('Error searching tracking:', error);
        showNotification('Error al buscar el rastreo', 'error');
        hideLoading();
    }
}

function renderTrackingResults(shipment, history) {
    const container = document.getElementById('tracking-results');

    container.innerHTML = `
    <div class="card">
      <h3>${shipment.trackingCode}</h3>
      <p><strong>Cliente:</strong> ${shipment.clientName}</p>
      <p><strong>Destinatario:</strong> ${shipment.recipient?.name || 'N/A'}</p>
      <p><strong>Ciudad:</strong> ${shipment.recipient?.city || 'N/A'}, ${shipment.recipient?.province || ''}</p>
      <p><strong>Estado:</strong> <span class="badge badge-${getStatusBadgeClass(shipment.status)}">${shipmentManager.getStatusLabel(shipment.status)}</span></p>
      <p><strong>Creado:</strong> ${formatDate(shipment.createdAt.toDate())}</p>
      
      <h4 class="mt-3">Historial de Rastreo</h4>
      <div class="tracking-timeline">
        ${history.map(h => `
          <div class="tracking-event">
            <strong>${formatDateTime(h.timestamp.toDate())}</strong> - ${h.location}<br>
            <span>${shipmentManager.getStatusLabel(h.status)}</span>
            ${h.notes ? `<p>${h.notes}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Reports
async function handleGenerateReport() {
    const startDate = new Date(document.getElementById('report-start-date').value);
    const endDate = new Date(document.getElementById('report-end-date').value);

    if (!startDate || !endDate) {
        showNotification('Por favor seleccione un rango de fechas', 'warning');
        return;
    }

    try {
        showLoading();

        const shipments = shipmentManager.getShipmentsByDateRange(startDate, endDate);
        const stats = shipmentManager.getStatistics(shipments);

        renderReport(stats, shipments, startDate, endDate);
        hideLoading();
    } catch (error) {
        console.error('Error generating report:', error);
        hideLoading();
    }
}

function renderReport(stats, shipments, startDate, endDate) {
    const container = document.getElementById('report-results');

    container.innerHTML = `
    <div class="card mt-3">
      <h3>Reporte: ${formatDate(startDate)} - ${formatDate(endDate)}</h3>
      
      <div class="stats-grid mt-3">
        <div class="stat-card">
          <div class="stat-label">Total Envíos</div>
          <div class="stat-value">${stats.total}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">Ingresos</div>
          <div class="stat-value">${costCalculator.formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">Costos</div>
          <div class="stat-value">${costCalculator.formatCurrency(stats.totalCosts)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ganancia</div>
          <div class="stat-value">${costCalculator.formatCurrency(stats.totalProfit)}</div>
        </div>
      </div>
      
      <div class="mt-3">
        <p><strong>Categoría B:</strong> ${stats.categoryB} envíos</p>
        <p><strong>Categoría G:</strong> ${stats.categoryG} envíos</p>
        <p><strong>Entregados:</strong> ${stats.delivered || 0}</p>
        <p><strong>En tránsito:</strong> ${stats.inTransit || 0}</p>
        <p><strong>Pendientes:</strong> ${stats.pending || 0}</p>
      </div>
    </div>
  `;
}

// Utility Functions
function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

function showLoading() {
    // Could add loading overlay
}

function hideLoading() {
    // Hide loading overlay
}

function formatDate(date) {
    return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

function formatDateTime(date) {
    return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function getStatusBadgeClass(status) {
    const classes = {
        'pending': 'warning',
        'in_transit': 'primary',
        'delivered': 'success',
        'cancelled': 'danger'
    };
    return classes[status] || 'primary';
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : type === 'warning' ? 'var(--warning)' : 'var(--primary)'};
    color: white;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-xl);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Success sound effect
function playSuccessSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCDiP2vPMeSwGJHS/8N6TQRABZ.../LY');
    audio.volume = 0.3;
    audio.play().catch(() => { }); // Ignore if blocked
}

// Global functions for onclick handlers
window.editClient = function (clientId) {
    openClientModal(clientId);
};

window.viewClientShipments = async function (clientId) {
    try {
        showLoading();
        const shipments = await shipmentManager.getShipmentsByClient(clientId);
        navigateToPage('shipments');
        renderShipmentsTable(shipments);
        hideLoading();
    } catch (error) {
        console.error('Error loading client shipments:', error);
        hideLoading();
    }
};

window.manageFamilyMembers = async function (clientId) {
    const client = await clientManager.getClientById(clientId);

    if (!client) {
        showNotification('Cliente no encontrado', 'error');
        return;
    }

    currentClientId = clientId;
    const members = client.consularRegistration?.familyMembers || [];

    if (members.length > 0) {
        const membersList = members.map((fm, i) => `${i + 1}. ${fm.name} (${fm.relationship}) - ${fm.city}`).join('\n');

        if (confirm(`👨‍👩‍👧 Familiares registrados para ${client.fullName}:\n\n${membersList}\n\n¿Desea agregar un nuevo familiar?`)) {
            document.getElementById('family-member-form').reset();
            document.getElementById('family-member-modal').classList.add('active');
        }
    } else {
        if (confirm(`${client.fullName} no tiene familiares registrados.\n\n¿Desea agregar un familiar ahora?`)) {
            document.getElementById('family-member-form').reset();
            document.getElementById('family-member-modal').classList.add('active');
        }
    }
};

window.viewShipmentDetail = async function (shipmentId) {
    try {
        const shipment = shipmentManager.shipments.find(s => s.id === shipmentId);
        if (!shipment) return;

        const modal = document.getElementById('shipment-detail-modal');
        const content = document.getElementById('shipment-detail-content');

        content.innerHTML = `
      <div class="card">
        <h3>${shipment.trackingCode}</h3>
        <p><strong>Cliente:</strong> ${shipment.clientName}</p>
        <p><strong>Destinatario:</strong> ${shipment.recipient?.name || 'N/A'}</p>
        <p><strong>Teléfono:</strong> ${shipment.recipient?.phone || 'N/A'}</p>
        <p><strong>Dirección:</strong> ${shipment.recipient?.address || 'N/A'}</p>
        <p><strong>Ciudad:</strong> ${shipment.recipient?.city || 'N/A'}, ${shipment.recipient?.province || ''}</p>
        <p><strong>Categoría:</strong> ${shipment.category}</p>
        <p><strong>Artículos:</strong> ${shipment.packageContent.items.join(', ')}</p>
        <p><strong>Valor declarado:</strong> ${costCalculator.formatCurrency(shipment.packageContent.declaredValue)}</p>
        <p><strong>Total:</strong> ${costCalculator.formatCurrency(shipment.costs.total)}</p>
        <p><strong>Cobrado al cliente:</strong> ${costCalculator.formatCurrency(shipment.payment?.amount || 25)}</p>
        <p><strong>Método de pago:</strong> ${shipment.payment?.method || 'N/A'}</p>
        <p><strong>Estado:</strong> <span class="badge badge-${getStatusBadgeClass(shipment.status)}">${shipmentManager.getStatusLabel(shipment.status)}</span></p>
        
        ${costCalculator.getCostBreakdownHTML(shipment.category, shipment.packageContent.declaredValue)}
      </div>
    `;

        modal.classList.add('active');
    } catch (error) {
        console.error('Error viewing shipment:', error);
    }
};

window.reprintLabels = async function (shipmentId) {
    try {
        const shipment = shipmentManager.shipments.find(s => s.id === shipmentId);
        if (!shipment) return;

        const client = await clientManager.getClientById(shipment.clientId);

        const choice = confirm('¿Qué desea reimprimir?\n\nOK = Recibo\nCancelar = Etiqueta');

        if (choice) {
            printManager.printReceipt(shipment, client);
            showNotification('📄 Recibo enviado a impresora', 'success');
        } else {
            printManager.printLabel(shipment, client);
            showNotification('🏷️ Etiqueta enviada a impresora', 'success');
        }
    } catch (error) {
        showNotification('Error al imprimir: ' + error.message, 'error');
    }
};

window.closeModal = closeModal;
window.loadRecipients = loadRecipients;
window.toggleRecipientInput = toggleRecipientInput;

// Add animation styles dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Script to update index.html with all modals
// Run this in browser console after opening index.html

// Add Family Member Modal HTML after client modal
const familyMemberModalHTML = `
<!-- Family Member Modal -->
<div id="family-member-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 class="modal-title">👨‍👩‍👧 Agregar Familiar en Ecuador</h3>
      <button class="modal-close" onclick="closeModal('family-member-modal')">✕</button>
    </div>

    <form id="family-member-form">
      <div class="form-group">
        <label class="form-label required">Nombre Completo</label>
        <input type="text" id="fm-name" class="form-input" required>
      </div>

      <div class="form-group">
        <label class="form-label required">Parentesco</label>
        <select id="fm-relationship" class="form-select" required>
          <option value="">Seleccione...</option>
          <option value="hijo/a">Hijo/a</option>
          <option value="hermano/a">Hermano/a</option>
          <option value="padre/madre">Padre/Madre</option>
          <option value="esposo/a">Esposo/a</option>
          <option value="nieto/a">Nieto/a</option>
          <option value="primo/a">Primo/a</option>
          <option value="tio/a">Tío/a</option>
          <option value="abuelo/a">Abuelo/a</option>
          <option value="sobrino/a">Sobrino/a</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label required">Cédula Ecuatoriana</label>
        <input type="text" id="fm-cedula" class="form-input" maxlength="10" required>
      </div>

      <div class="form-group">
        <label class="form-label required">Teléfono</label>
        <input type="tel" id="fm-phone" class="form-input" required>
      </div>

      <div class="form-group">
        <label class="form-label required">Dirección Completa</label>
        <textarea id="fm-address" class="form-textarea" rows="3" required></textarea>
        <small style="color: var(--text-muted);">Calle principal, número, intersección, referencias</small>
      </div>

      <div class="form-group">
        <label class="form-label required">Ciudad</label>
        <input type="text" id="fm-city" class="form-input" required>
      </div>

      <div class="form-group">
        <label class="form-label required">Provincia</label>
        <select id="fm-province" class="form-select" required>
          <option value="">Seleccione...</option>
          <option value="Azuay">Azuay</option>
          <option value="Bolívar">Bolívar</option>
          <option value="Cañar">Cañar</option>
          <option value="Carchi">Carchi</option>
          <option value="Chimborazo">Chimborazo</option>
          <option value="Cotopaxi">Cotopaxi</option>
          <option value="El Oro">El Oro</option>
          <option value="Esmeraldas">Esmeraldas</option>
          <option value="Galápagos">Galápagos</option>
          <option value="Guayas">Guayas</option>
          <option value="Imbabura">Imbabura</option>
          <option value="Loja">Loja</option>
          <option value="Los Ríos">Los Ríos</option>
          <option value="Manabí">Manabí</option>
          <option value="Morona Santiago">Morona Santiago</option>
          <option value="Napo">Napo</option>
          <option value="Orellana">Orellana</option>
          <option value="Pastaza">Pastaza</option>
          <option value="Pichincha">Pichincha</option>
          <option value="Santa Elena">Santa Elena</option>
          <option value="Santo Domingo">Santo Domingo de los Tsáchilas</option>
          <option value="Sucumbíos">Sucumbíos</option>
          <option value="Tungurahua">Tungurahua</option>
          <option value="Zamora Chinchipe">Zamora Chinchipe</option>
        </select>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('family-member-modal')">Cancelar</button>
        <button type="submit" class="btn btn-primary">
          <span class="spinner hidden" id="fm-submit-spinner"></span>
          <span id="fm-submit-text">Guardar Familiar</span>
        </button>
      </div>
    </form>
  </div>
</div>`;

// Recipient section HTML to add in shipment modal
const recipientSectionHTML = `
<!-- Recipient Section -->
<div id="recipient-section" class="hidden" style="border: 2px solid var(--primary); padding: 1rem; border-radius: var(--radius-md); margin: var(--spacing-md) 0; background: rgba(99, 102, 241, 0.05);">
  <h4 style="margin-bottom: var(--spacing-md); display: flex; align-items: center; gap: 0.5rem;">
    <span>📍</span>
    <span>Destinatario en Ecuador</span>
  </h4>
  
  <div class="form-group">
    <label class="checkbox-label">
      <input type="checkbox" id="use-manual-recipient" onchange="toggleRecipientInput()">
      <span>Ingresar destinatario manualmente</span>
    </label>
  </div>

  <div id="recipient-select-container">
    <div class="form-group">
      <label class="form-label required">Seleccionar Familiar Registrado</label>
      <select id="recipient-select" class="form-select">
        <option value="">Seleccione un familiar...</option>
      </select>
    </div>
  </div>

  <div id="recipient-manual-container" class="hidden">
    <div class="form-group">
      <label class="form-label required">Nombre Completo</label>
      <input type="text" id="recipient-name" class="form-input">
    </div>
    <div class="form-group">
      <label class="form-label required">Teléfono</label>
      <input type="tel" id="recipient-phone" class="form-input">
    </div>
    <div class="form-group">
      <label class="form-label required">Dirección Completa</label>
      <textarea id="recipient-address" class="form-textarea" rows="2"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label required">Ciudad</label>
      <input type="text" id="recipient-city" class="form-input">
    </div>
    <div class="form-group">
      <label class="form-label required">Provincia</label>
      <input type="text" id="recipient-province" class="form-input">
    </div>
    <div class="form-group">
      <label class="form-label">Cédula (opcional)</label>
      <input type="text" id="recipient-id" class="form-input">
    </div>
  </div>
</div>`;

// Payment method selector
const paymentMethodHTML = `
<div class="form-group">
  <label class="form-label required">Método de Pago</label>
  <select id="payment-method" class="form-select" required>
    <option value="cash">💵 Efectivo</option>
    <option value="card">💳 Tarjeta</option>
    <option value="transfer">🏦 Transferencia</option>
    <option value="check">🧾 Cheque</option>
  </select>
</div>`;

console.log('Family Express - HTML Components Ready!');
console.log('1. Family Member Modal:', familyMemberModalHTML);
console.log('2. Recipient Section:', recipientSectionHTML);
console.log('3. Payment Method:', paymentMethodHTML);

// Instructions
console.log(`
%cINSTRUCCIONES PARA ACTUALIZAR INDEX.HTML:
%c
1. Agregar el modal de familiares DESPUÉS del modal de cliente (antes del modal de envío)
2. En el formulario de envío, agregar la sección de destinatario DESPUÉS del selector de cliente
3. Agregar el selector de método de pago DESPUÉS del valor declarado
4. Cambiar el texto del botón submit a: "💵 Cobrar $25.00 y Crear Envío"

¿No quieres hacerlo manual? Abre la consola del navegador y ejecuta este archivo!
`, 'color: #6366f1; font-size: 16px; font-weight: bold;', 'color: #94a3b8;');

// Auto-inject if running in browser
if (typeof document !== 'undefined') {
    // Find shipment modal and inject recipient section
    try {
        const shipmentForm = document.getElementById('shipment-form');
        if (shipmentForm) {
            const clientGroup = shipmentForm.querySelector('.form-group');
            if (clientGroup) {
                clientGroup.insertAdjacentHTML('afterend', recipientSectionHTML);
                console.log('✅ Recipient section injected!');
            }
        }

        // Find payment method location and inject
        const shipmentValue = document.getElementById('shipment-value');
        if (shipmentValue) {
            const valueGroup = shipmentValue.closest('.form-group');
            if (valueGroup) {
                valueGroup.insertAdjacentHTML('afterend', paymentMethodHTML);
                console.log('✅ Payment method injected!');
            }
        }

        // Inject family member modal
        const clientModal = document.getElementById('client-modal');
        if (clientModal) {
            clientModal.insertAdjacentHTML('afterend', familyMemberModalHTML);
            console.log('✅ Family member modal injected!');
        }

        // Update submit button text
        const submitText = document.getElementById('shipment-submit-text');
        if (submitText) {
            submitText.textContent = '💵 Cobrar $25.00 y Crear Envío';
            console.log('✅ Submit button text updated!');
        }

        console.log('%c🎉 ¡TODO INYECTADO EXITOSAMENTE!', 'color: #10b981; font-size: 20px; font-weight: bold;');
        console.log('%cRecarga la página para ver los cambios', 'color: #f59e0b; font-size: 14px;');
    } catch (error) {
        console.error('Error inyectando componentes:', error);
    }
}

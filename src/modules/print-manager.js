// Receipt and Label Printing Module
import costCalculator from './cost-calculator.js';

class PrintManager {
    // Generate receipt HTML
    generateReceiptHTML(shipment, client) {
        const date = shipment.createdAt.toDate();
        const formattedDate = new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);

        return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Recibo - ${shipment.trackingCode}</title>
        <style>
          @page { size: 80mm 120mm; margin: 5mm; }
          body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .logo { font-size: 24px; font-weight: bold; }
          .company-name { font-size: 16px; font-weight: bold; margin: 5px 0; }
          .section { margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .label { font-weight: bold; }
          .total-section { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 5px 0; margin: 10px 0; }
          .total { font-size: 16px; font-weight: bold; }
          .footer { text-align: center; border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px; font-size: 10px; }
          .barcode { text-align: center; font-size: 14px; font-weight: bold; letter-spacing: 2px; margin: 10px 0; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">📦</div>
          <div class="company-name">FAMILY EXPRESS</div>
          <div>Envíos USA → Ecuador</div>
          <div style="font-size: 10px; margin-top: 5px;">Tel: (XXX) XXX-XXXX</div>
        </div>

        <div class="section">
          <div class="row"><span>Fecha:</span> <span>${formattedDate}</span></div>
          <div class="row"><span class="label">Recibo N°:</span> <span>${shipment.id.substring(0, 8).toUpperCase()}</span></div>
        </div>

        <div class="section">
          <div style="font-weight: bold; margin-bottom: 5px;">REMITENTE (USA)</div>
          <div>${client.fullName}</div>
          <div>${client.phone}</div>
          <div>${client.email || ''}</div>
        </div>

        <div class="section">
          <div style="font-weight: bold; margin-bottom: 5px;">DESTINATARIO (Ecuador)</div>
          <div>${shipment.recipient?.name || 'N/A'}</div>
          <div>${shipment.recipient?.phone || ''}</div>
          <div style="font-size: 10px;">${shipment.recipient?.address || ''}</div>
          <div style="font-size: 10px;">${shipment.recipient?.city || ''}, ${shipment.recipient?.province || ''}</div>
        </div>

        <div class="section">
          <div style="font-weight: bold; margin-bottom: 5px;">DETALLES DEL PAQUETE</div>
          <div class="row"><span>Código de rastreo:</span></div>
          <div class="barcode">${shipment.trackingCode}</div>
          <div class="row"><span>Categoría:</span> <span>${shipment.category}</span></div>
          <div class="row"><span>Peso:</span> <span>${shipment.weight} lbs</span></div>
          <div class="row"><span>Valor declarado:</span> <span>${costCalculator.formatCurrency(shipment.packageContent.declaredValue)}</span></div>
          <div class="row"><span>Contenido:</span></div>
          <div style="font-size: 10px; margin-left: 10px;">${shipment.packageContent.items.join(', ')}</div>
        </div>

        <div class="total-section">
          <div class="row total">
            <span>TOTAL PAGADO:</span>
            <span>${costCalculator.formatCurrency(shipment.payment?.amount || shipment.revenue.chargedToClient)}</span>
          </div>
          <div class="row" style="font-size: 10px;">
            <span>Método de pago:</span>
            <span>${this.getPaymentMethodLabel(shipment.payment?.method || 'cash')}</span>
          </div>
        </div>

        <div class="footer">
          <div>¡Gracias por confiar en Family Express!</div>
          <div style="margin-top: 5px;">Puede rastrear su paquete en:</div>
          <div style="font-weight: bold;">www.familyexpress.com/tracking</div>
          <div style="margin-top: 5px;">Ingrese su código: ${shipment.trackingCode}</div>
        </div>
      </body>
      </html>
    `;
    }

    // Generate shipping label HTML
    generateLabelHTML(shipment, client) {
        const date = shipment.createdAt.toDate();
        const formattedDate = new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);

        return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Etiqueta - ${shipment.trackingCode}</title>
        <style>
          @page { size: 100mm 150mm; margin: 0; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 10px; font-size: 11px; }
          .label-container { border: 3px solid #000; padding: 10px; height: 95%; box-sizing: border-box; }
          .header { text-align: center; background: #000; color: #fff; padding: 8px; margin: -10px -10px 10px -10px; }
          .logo { font-size: 20px; }
          .company { font-size: 14px; font-weight: bold; }
          .section { margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #ccc; }
          .section:last-child { border-bottom: none; }
          .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #666; margin-bottom: 3px; }
          .large-text { font-size: 14px; font-weight: bold; }
          .tracking-code { font-size: 18px; font-weight: bold; text-align: center; background: #f0f0f0; padding: 8px; margin: 10px 0; letter-spacing: 1px; border: 2px dashed #000; }
          .category-badge { display: inline-block; background: #000; color: #fff; padding: 4px 8px; font-weight: bold; font-size: 12px; }
          .barcode-area { text-align: center; margin: 10px 0; font-size: 24px; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="header">
            <div class="logo">📦 FAMILY EXPRESS</div>
            <div class="company">USA → ECUADOR</div>
          </div>

          <div class="tracking-code">${shipment.trackingCode}</div>

          <div class="section">
            <div class="section-title">📍 DESTINATARIO (Ecuador)</div>
            <div class="large-text">${shipment.recipient?.name || 'N/A'}</div>
            <div>${shipment.recipient?.phone || ''}</div>
            <div style="margin-top: 3px;">${shipment.recipient?.address || ''}</div>
            <div><strong>${shipment.recipient?.city || ''}, ${shipment.recipient?.province || ''}</strong></div>
            <div>Cédula: ${shipment.recipient?.idNumber || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">📤 REMITENTE (USA)</div>
            <div><strong>${client.fullName}</strong></div>
            <div>${client.phone}</div>
            <div style="font-size: 9px;">ID: ${client.idNumber}</div>
          </div>

          <div class="section">
            <div class="section-title">📦 INFORMACIÓN DEL PAQUETE</div>
            <div style="display: flex; justify-content: space-between; margin-top: 3px;">
              <div>
                <div><strong>Peso:</strong> ${shipment.weight} lbs</div>
                <div><strong>Categoría:</strong> <span class="category-badge">${shipment.category}</span></div>
              </div>
              <div style="text-align: right;">
                <div><strong>Fecha:</strong> ${formattedDate}</div>
                <div><strong>Valor:</strong> ${costCalculator.formatCurrency(shipment.packageContent.declaredValue)}</div>
              </div>
            </div>
          </div>

          <div class="section" style="border-bottom: none;">
            <div class="section-title">📋 CONTENIDO</div>
            <div style="font-size: 10px; line-height: 1.3;">
              ${shipment.packageContent.items.join(' • ')}
            </div>
          </div>

          <div style="text-align: center; margin-top: 10px; font-size: 9px; color: #666;">
            Family Express - Servicio de envíos USA-Ecuador
          </div>
        </div>
      </body>
      </html>
    `;
    }

    // Print receipt
    printReceipt(shipment, client) {
        const receiptHTML = this.generateReceiptHTML(shipment, client);
        this.openPrintWindow(receiptHTML, 'Recibo');
    }

    // Print label
    printLabel(shipment, client) {
        const labelHTML = this.generateLabelHTML(shipment, client);
        this.openPrintWindow(labelHTML, 'Etiqueta');
    }

    // Open print window
    openPrintWindow(html, title) {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();

            // Wait for content to load, then print
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                }, 250);
            };
        } else {
            alert('Por favor permita ventanas emergentes para imprimir');
        }
    }

    // Get payment method label
    getPaymentMethodLabel(method) {
        const labels = {
            'cash': 'Efectivo',
            'card': 'Tarjeta',
            'transfer': 'Transferencia',
            'check': 'Cheque'
        };
        return labels[method] || method;
    }
}

export default new PrintManager();

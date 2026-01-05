// Shipment Manager Module - UPDATED WITH RECIPIENT & PAYMENT
import { db, collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, Timestamp } from '../config/firebase-config.js';
import trackingGenerator from './tracking-generator.js';
import costCalculator from './cost-calculator.js';

class ShipmentManager {
    constructor() {
        this.shipments = [];
    }

    // Create new shipment with recipient and payment info
    async createShipment(shipmentData) {
        try {
            // Generate tracking code
            const trackingCode = await trackingGenerator.generateTrackingCode();

            // Calculate costs
            const costs = shipmentData.category === 'B'
                ? costCalculator.calculateCategoryB(shipmentData.declaredValue)
                : costCalculator.calculateCategoryG(shipmentData.declaredValue);

            // Calculate revenue
            const profit = costCalculator.calculateProfit(shipmentData.category, shipmentData.declaredValue);

            const shipment = {
                trackingCode: trackingCode,
                clientId: shipmentData.clientId,
                clientName: shipmentData.clientName,
                category: shipmentData.category,

                // Recipient information in Ecuador
                recipient: {
                    name: shipmentData.recipientName || '',
                    phone: shipmentData.recipientPhone || '',
                    address: shipmentData.recipientAddress || '',
                    city: shipmentData.recipientCity || '',
                    province: shipmentData.recipientProvince || '',
                    idNumber: shipmentData.recipientId || ''
                },

                packageContent: {
                    items: shipmentData.items || [],
                    declaredValue: parseFloat(shipmentData.declaredValue) || 0
                },
                weight: 8, // Always 8 pounds
                costs: {
                    baseShipping: costs.shipping,
                    courierTax: costs.courierTax,
                    fodinfa: costs.fodinfa,
                    total: costs.total
                },
                revenue: {
                    costToCompany: costs.total,
                    chargedToClient: costCalculator.CLIENT_PRICE,
                    profit: profit.profit
                },

                // Payment information
                payment: {
                    amount: costCalculator.CLIENT_PRICE,
                    method: shipmentData.paymentMethod || 'cash',
                    status: 'paid',
                    paidAt: Timestamp.now(),
                    receiptPrinted: false,
                    labelPrinted: false
                },

                status: 'pending',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                deliveredAt: null
            };

            const docRef = await addDoc(collection(db, 'shipments'), shipment);
            shipment.id = docRef.id;

            // Add to tracking history
            await this.addTrackingHistory(docRef.id, trackingCode, 'pending', 'USA', 'Paquete registrado y pagado');

            this.shipments.unshift(shipment);
            return shipment;
        } catch (error) {
            console.error('Error creating shipment:', error);
            throw error;
        }
    }

    // Mark receipt as printed
    async markReceiptPrinted(shipmentId) {
        try {
            const shipmentRef = doc(db, 'shipments', shipmentId);
            await updateDoc(shipmentRef, {
                'payment.receiptPrinted': true,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error marking receipt printed:', error);
        }
    }

    // Mark label as printed
    async markLabelPrinted(shipmentId) {
        try {
            const shipmentRef = doc(db, 'shipments', shipmentId);
            await updateDoc(shipmentRef, {
                'payment.labelPrinted': true,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error marking label printed:', error);
        }
    }

    // Update shipment status
    async updateShipmentStatus(shipmentId, status, location = '', notes = '') {
        try {
            const shipmentRef = doc(db, 'shipments', shipmentId);
            const shipmentDoc = await getDoc(shipmentRef);

            if (!shipmentDoc.exists()) {
                throw new Error('Shipment not found');
            }

            const updates = {
                status: status,
                updatedAt: Timestamp.now()
            };

            if (status === 'delivered') {
                updates.deliveredAt = Timestamp.now();
            }

            await updateDoc(shipmentRef, updates);

            // Add to tracking history
            const trackingCode = shipmentDoc.data().trackingCode;
            await this.addTrackingHistory(shipmentId, trackingCode, status, location, notes);

            // Update local cache
            const index = this.shipments.findIndex(s => s.id === shipmentId);
            if (index !== -1) {
                this.shipments[index] = { ...this.shipments[index], ...updates };
            }

            return { id: shipmentId, ...updates };
        } catch (error) {
            console.error('Error updating shipment status:', error);
            throw error;
        }
    }

    // Add tracking history entry
    async addTrackingHistory(shipmentId, trackingCode, status, location, notes) {
        try {
            const history = {
                shipmentId: shipmentId,
                trackingCode: trackingCode,
                status: status,
                location: location,
                notes: notes,
                timestamp: Timestamp.now()
            };

            await addDoc(collection(db, 'tracking_history'), history);
            return history;
        } catch (error) {
            console.error('Error adding tracking history:', error);
            throw error;
        }
    }

    // Get tracking history for shipment
    async getTrackingHistory(trackingCode) {
        try {
            const q = query(
                collection(db, 'tracking_history'),
                where('trackingCode', '==', trackingCode),
                orderBy('timestamp', 'asc')
            );

            const snapshot = await getDocs(q);
            const history = [];

            snapshot.forEach(doc => {
                history.push({ id: doc.id, ...doc.data() });
            });

            return history;
        } catch (error) {
            console.error('Error getting tracking history:', error);
            throw error;
        }
    }

    // Get all shipments
    async getAllShipments() {
        try {
            const q = query(collection(db, 'shipments'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            this.shipments = [];
            snapshot.forEach(doc => {
                this.shipments.push({ id: doc.id, ...doc.data() });
            });

            return this.shipments;
        } catch (error) {
            console.error('Error getting shipments:', error);
            throw error;
        }
    }

    // Get shipment by tracking code
    async getShipmentByTrackingCode(trackingCode) {
        try {
            const q = query(
                collection(db, 'shipments'),
                where('trackingCode', '==', trackingCode)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }

            return null;
        } catch (error) {
            console.error('Error getting shipment by tracking code:', error);
            throw error;
        }
    }

    // Get shipments by client
    async getShipmentsByClient(clientId) {
        try {
            const q = query(
                collection(db, 'shipments'),
                where('clientId', '==', clientId),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            const shipments = [];

            snapshot.forEach(doc => {
                shipments.push({ id: doc.id, ...doc.data() });
            });

            return shipments;
        } catch (error) {
            console.error('Error getting shipments by client:', error);
            throw error;
        }
    }

    // Get shipments by status
    getShipmentsByStatus(status) {
        return this.shipments.filter(s => s.status === status);
    }

    // Get shipments by date range
    getShipmentsByDateRange(startDate, endDate) {
        return this.shipments.filter(s => {
            const shipmentDate = s.createdAt.toDate();
            return shipmentDate >= startDate && shipmentDate <= endDate;
        });
    }

    // Calculate statistics
    getStatistics(shipments = this.shipments) {
        const stats = {
            total: shipments.length,
            pending: 0,
            inTransit: 0,
            delivered: 0,
            cancelled: 0,
            categoryB: 0,
            categoryG: 0,
            totalRevenue: 0,
            totalCosts: 0,
            totalProfit: 0
        };

        shipments.forEach(shipment => {
            // Count by status
            stats[shipment.status] = (stats[shipment.status] || 0) + 1;

            // Count by category
            if (shipment.category === 'B') {
                stats.categoryB++;
            } else {
                stats.categoryG++;
            }

            // Sum financials
            stats.totalRevenue += shipment.revenue.chargedToClient;
            stats.totalCosts += shipment.revenue.costToCompany;
            stats.totalProfit += shipment.revenue.profit;
        });

        return stats;
    }

    // Validate shipment data
    validateShipmentData(data) {
        const errors = [];

        if (!data.clientId) {
            errors.push('Cliente es requerido');
        }

        if (!data.category || !['B', 'G'].includes(data.category)) {
            errors.push('Categoría debe ser B o G');
        }

        if (!data.items || data.items.length === 0) {
            errors.push('Debe seleccionar al menos un artículo');
        }

        if (!data.declaredValue || parseFloat(data.declaredValue) <= 0) {
            errors.push('Valor declarado debe ser mayor a 0');
        }

        if (parseFloat(data.declaredValue) > 400) {
            errors.push('Valor declarado no puede exceder $400 USD');
        }

        // Validate recipient
        if (!data.recipientName || data.recipientName.trim() === '') {
            errors.push('Nombre del destinatario es requerido');
        }

        if (!data.recipientPhone || data.recipientPhone.trim() === '') {
            errors.push('Teléfono del destinatario es requerido');
        }

        if (!data.recipientAddress || data.recipientAddress.trim() === '') {
            errors.push('Dirección del destinatario es requerida');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Get status label in Spanish
    getStatusLabel(status) {
        const labels = {
            'pending': 'Pendiente',
            'in_transit': 'En tránsito',
            'delivered': 'Entregado',
            'cancelled': 'Cancelado'
        };
        return labels[status] || status;
    }
}

export default new ShipmentManager();

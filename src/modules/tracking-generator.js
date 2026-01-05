// Tracking Code Generator Module
import { db, collection, getDocs, query, where } from '../config/firebase-config.js';

class TrackingGenerator {
    constructor() {
        this.prefix = 'FE'; // Family Express
    }

    // Generate unique tracking code
    async generateTrackingCode() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const dateStr = `${year}${month}${day}`;

        // Get today's shipment count to generate sequential number
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        try {
            const shipmentsRef = collection(db, 'shipments');
            const q = query(
                shipmentsRef,
                where('createdAt', '>=', startOfDay),
                where('createdAt', '<=', endOfDay)
            );

            const snapshot = await getDocs(q);
            const count = snapshot.size + 1;
            const sequential = String(count).padStart(4, '0');

            const trackingCode = `${this.prefix}-${dateStr}-${sequential}`;

            // Verify uniqueness
            const isUnique = await this.verifyUnique(trackingCode);
            if (!isUnique) {
                // If not unique, add random suffix
                const randomSuffix = Math.floor(Math.random() * 1000);
                return `${trackingCode}-${randomSuffix}`;
            }

            return trackingCode;
        } catch (error) {
            console.error('Error generating tracking code:', error);
            // Fallback to timestamp-based code
            return `${this.prefix}-${Date.now()}`;
        }
    }

    // Verify tracking code is unique
    async verifyUnique(trackingCode) {
        try {
            const shipmentsRef = collection(db, 'shipments');
            const q = query(shipmentsRef, where('trackingCode', '==', trackingCode));
            const snapshot = await getDocs(q);
            return snapshot.empty;
        } catch (error) {
            console.error('Error verifying tracking code:', error);
            return false;
        }
    }

    // Parse tracking code
    parseTrackingCode(trackingCode) {
        const parts = trackingCode.split('-');
        if (parts.length < 3 || parts[0] !== this.prefix) {
            return null;
        }

        const dateStr = parts[1];
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const sequential = parts[2];

        return {
            prefix: parts[0],
            date: `${year}-${month}-${day}`,
            sequential: sequential,
            full: trackingCode
        };
    }
}

export default new TrackingGenerator();

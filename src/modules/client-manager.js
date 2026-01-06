// Client Manager Module - UPDATED WITH FAMILY MEMBERS MANAGEMENT
import { db, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, query, where, orderBy, Timestamp, storage, ref, uploadBytes, getDownloadURL } from '../config/firebase-config.js';
import { uploadToB2, deleteFromB2 } from '../config/b2-config.js';

class ClientManager {
    constructor() {
        this.clients = [];
        this.currentClient = null;
    }

    // Create new client
    async createClient(clientData, photoFile = null) {
        try {
            let photoUrl = '';

            // Upload photo to Firebase Storage if provided
            if (photoFile) {
                try {
                    const storageRef = ref(storage, `clients/${Date.now()}_${photoFile.name}`);
                    const snapshot = await uploadBytes(storageRef, photoFile);
                    photoUrl = await getDownloadURL(snapshot.ref);
                } catch (e) {
                    console.error("Error uploading client photo:", e);
                }
            }

            const client = {
                fullName: clientData.fullName,
                phone: clientData.phone,
                email: clientData.email || '',
                address: clientData.address,
                idNumber: clientData.idNumber,
                category: clientData.category, // 'B' or 'G'
                consularRegistration: {
                    hasRegistration: clientData.category === 'G',
                    registrationNumber: clientData.registrationNumber || '',
                    familyMembers: [] // Initialize empty array for family members
                },
                photoUrl: photoUrl,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(collection(db, 'clients'), client);
            client.id = docRef.id;

            this.clients.push(client);
            return client;
        } catch (error) {
            console.error('Error creating client:', error);
            throw error;
        }
    }

    // Add family member to client
    async addFamilyMember(clientId, familyMemberData, photos = {}) {
        try {
            // Check Admin collection
            let clientRef = doc(db, 'clients', clientId);
            let clientDoc = await getDoc(clientRef);

            if (!clientDoc.exists()) {
                // Check Web collection
                clientRef = doc(db, 'clients_web', clientId);
                clientDoc = await getDoc(clientRef);
            }

            if (!clientDoc.exists()) {
                throw new Error('Client not found');
            }

            const client = clientDoc.data();

            let photoUrlFront = '';
            let photoUrlBack = '';

            // Upload Front
            if (photos.front) {
                try {
                    const storageRef = ref(storage, `family_photos/${clientId}/${Date.now()}_front_${photos.front.name}`);
                    const snapshot = await uploadBytes(storageRef, photos.front);
                    photoUrlFront = await getDownloadURL(snapshot.ref);
                } catch (err) {
                    console.error('Error uploading front photo:', err);
                }
            }

            // Upload Back
            if (photos.back) {
                try {
                    const storageRef = ref(storage, `family_photos/${clientId}/${Date.now()}_back_${photos.back.name}`);
                    const snapshot = await uploadBytes(storageRef, photos.back);
                    photoUrlBack = await getDownloadURL(snapshot.ref);
                } catch (err) {
                    console.error('Error uploading back photo:', err);
                }
            }

            // Create family member with unique ID
            const familyMember = {
                id: `fm-${Date.now()}`,
                name: familyMemberData.name,
                relationship: familyMemberData.relationship,
                ecuadorianId: familyMemberData.ecuadorianId,
                phone: familyMemberData.phone,
                address: familyMemberData.address,
                city: familyMemberData.city,
                province: familyMemberData.province,
                photoUrlFront: photoUrlFront,
                photoUrlBack: photoUrlBack,
                // Legacy field for backward compat if any code used it, though we just added it.
                // We'll trust front as the main one if someone asks for a single photo.
                photoUrl: photoUrlFront,
                createdAt: Timestamp.now()
            };

            // Add to family members array
            // Ensure consularRegistration exists (it might not in web clients)
            let consularRegistration = client.consularRegistration;
            if (!consularRegistration) {
                consularRegistration = { familyMembers: [], hasRegistration: false, registrationNumber: '' };
            }

            const familyMembers = consularRegistration.familyMembers || [];
            familyMembers.push(familyMember);

            // Re-assign in case struct was missing
            consularRegistration.familyMembers = familyMembers;

            await updateDoc(clientRef, {
                'consularRegistration': consularRegistration,
                updatedAt: Timestamp.now()
            });

            // Update local cache
            const index = this.clients.findIndex(c => c.id === clientId);
            if (index !== -1) {
                if (!this.clients[index].consularRegistration) this.clients[index].consularRegistration = {};
                this.clients[index].consularRegistration.familyMembers = familyMembers;
            }

            return familyMember;
        } catch (error) {
            console.error('Error adding family member:', error);
            throw error;
        }
    }

    // Remove family member from client
    async removeFamilyMember(clientId, familyMemberId) {
        try {
            // Check Admin collection
            let clientRef = doc(db, 'clients', clientId);
            let clientDoc = await getDoc(clientRef);

            if (!clientDoc.exists()) {
                // Check Web collection
                clientRef = doc(db, 'clients_web', clientId);
                clientDoc = await getDoc(clientRef);
            }

            if (!clientDoc.exists()) {
                throw new Error('Client not found');
            }

            const client = clientDoc.data();
            const familyMembers = (client.consularRegistration?.familyMembers || [])
                .filter(fm => fm.id !== familyMemberId);

            // Re-construct logic to be safe for web clients updates
            let consularRegistration = client.consularRegistration || { familyMembers: [], hasRegistration: false, registrationNumber: '' };
            consularRegistration.familyMembers = familyMembers;

            await updateDoc(clientRef, {
                'consularRegistration': consularRegistration,
                updatedAt: Timestamp.now()
            });

            // Update local cache
            const index = this.clients.findIndex(c => c.id === clientId);
            if (index !== -1) {
                if (!this.clients[index].consularRegistration) this.clients[index].consularRegistration = {};
                this.clients[index].consularRegistration.familyMembers = familyMembers;
            }

            return true;
        } catch (error) {
            console.error('Error removing family member:', error);
            throw error;
        }
    }

    // Get family members for a client
    getFamilyMembers(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        return client?.consularRegistration?.familyMembers || [];
    }

    // Update client
    async updateClient(clientId, updates, photoFile = null) {
        try {
            // Check Admin collection
            let collectionName = 'clients';
            let clientRef = doc(db, 'clients', clientId);
            let clientDoc = await getDoc(clientRef);

            if (!clientDoc.exists()) {
                // Check Web collection
                clientRef = doc(db, 'clients_web', clientId);
                clientDoc = await getDoc(clientRef);
                collectionName = 'clients_web';
            }

            if (!clientDoc.exists()) {
                throw new Error('Client not found');
            }

            let photoUrl = clientDoc.data().photoUrl;

            // Upload new photo if provided
            if (photoFile) {
                // TODO: Delete old photo if exists (needs to check if it's B2 or Firebase)
                /* if (photoUrl) { await deleteFromB2(photoUrl); } */

                try {
                    const storageRef = ref(storage, `clients/${clientId}/${Date.now()}_${photoFile.name}`);
                    const snapshot = await uploadBytes(storageRef, photoFile);
                    photoUrl = await getDownloadURL(snapshot.ref);
                } catch (e) {
                    console.error("Error uploading new client photo:", e);
                }
            }

            const updatedData = {
                ...updates,
                photoUrl: photoUrl,
                updatedAt: Timestamp.now()
            };

            await updateDoc(clientRef, updatedData);

            // Update local cache
            const index = this.clients.findIndex(c => c.id === clientId);
            if (index !== -1) {
                // Preserve source and other fields not in updates
                this.clients[index] = {
                    ...this.clients[index],
                    ...updatedData,
                    id: clientId,
                    source: collectionName === 'clients' ? 'admin' : 'web'
                };
            }

            return { id: clientId, ...updatedData };
        } catch (error) {
            console.error('Error updating client:', error);
            throw error;
        }
    }

    // Delete client
    async deleteClient(clientId) {
        try {
            const clientRef = doc(db, 'clients', clientId);
            const clientDoc = await getDoc(clientRef);

            if (clientDoc.exists()) {
                const photoUrl = clientDoc.data().photoUrl;

                // Delete photo from B2
                if (photoUrl) {
                    await deleteFromB2(photoUrl);
                }

                await deleteDoc(clientRef);

                // Remove from local cache
                this.clients = this.clients.filter(c => c.id !== clientId);
            }

            return true;
        } catch (error) {
            console.error('Error deleting client:', error);
            throw error;
        }
    }

    // Get all clients (Unified: Admin 'clients' + Web 'clients_web')
    async getAllClients() {
        try {
            this.clients = [];

            // 1. Fetch Admin Clients
            const q1 = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
            const snap1 = await getDocs(q1);
            snap1.forEach(doc => {
                this.clients.push({ id: doc.id, source: 'admin', ...doc.data() });
            });

            // 2. Fetch Web Clients
            const q2 = query(collection(db, 'clients_web'), orderBy('createdAt', 'desc'));
            const snap2 = await getDocs(q2);
            snap2.forEach(doc => {
                const data = doc.data();
                // Map web fields to client schema if needed
                this.clients.push({
                    id: doc.id,
                    source: 'web',
                    fullName: data.fullName,
                    email: data.email,
                    phone: data.phone || '',
                    address: data.address || '',
                    city: data.city || '',
                    province: data.province || '',
                    idNumber: data.idNumber || '', // Might be missing
                    category: data.category || 'B', // Use stored category or default
                    suiteId: data.suiteId,
                    photoUrl: data.photoUrl,
                    consularRegistration: data.consularRegistration || { familyMembers: [] }, // Use stored struct or default
                    createdAt: data.createdAt
                });
            });

            // Sort merged list by date (newest first)
            this.clients.sort((a, b) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tB - tA;
            });

            return this.clients;
        } catch (error) {
            console.error('Error getting clients:', error);
            throw error;
        }
    }

    // Get client by ID
    async getClientById(clientId) {
        try {
            // Try Admin collection first
            let clientRef = doc(db, 'clients', clientId);
            let clientDoc = await getDoc(clientRef);

            if (clientDoc.exists()) {
                return { id: clientDoc.id, source: 'admin', ...clientDoc.data() };
            }

            // Try Web collection
            clientRef = doc(db, 'clients_web', clientId);
            clientDoc = await getDoc(clientRef);

            if (clientDoc.exists()) {
                const data = clientDoc.data();
                return {
                    id: clientDoc.id,
                    source: 'web',
                    fullName: data.fullName,
                    email: data.email,
                    phone: data.phone || '',
                    address: data.address || '',
                    city: data.city || '',
                    province: data.province || '',
                    idNumber: data.idNumber || '',
                    category: data.category || 'B',
                    suiteId: data.suiteId,
                    photoUrl: data.photoUrl,
                    consularRegistration: data.consularRegistration || { familyMembers: [] }
                };
            }

            return null;
        } catch (error) {
            console.error('Error getting client:', error);
            throw error;
        }
    }

    // Search clients
    searchClients(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.clients.filter(client =>
            client.fullName.toLowerCase().includes(term) ||
            client.phone.includes(term) ||
            client.email.toLowerCase().includes(term) ||
            client.idNumber.includes(term)
        );
    }

    // Get clients by category
    getClientsByCategory(category) {
        return this.clients.filter(client => client.category === category);
    }

    // Validate client data
    validateClientData(data) {
        const errors = [];

        if (!data.fullName || data.fullName.trim() === '') {
            errors.push('Nombre completo es requerido');
        }

        if (!data.phone || data.phone.trim() === '') {
            errors.push('Teléfono es requerido');
        }

        if (!data.address || data.address.trim() === '') {
            errors.push('Dirección es requerida');
        }

        if (!data.idNumber || data.idNumber.trim() === '') {
            errors.push('Número de identificación es requerido');
        }

        if (!data.category || !['B', 'G'].includes(data.category)) {
            errors.push('Categoría debe ser B o G');
        }

        if (data.category === 'G' && (!data.registrationNumber || data.registrationNumber.trim() === '')) {
            errors.push('Número de registro consular es requerido para categoría G');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Validate family member data
    validateFamilyMemberData(data) {
        const errors = [];

        if (!data.name || data.name.trim() === '') {
            errors.push('Nombre del familiar es requerido');
        }

        if (!data.relationship || data.relationship.trim() === '') {
            errors.push('Parentesco es requerido');
        }

        if (!data.ecuadorianId || data.ecuadorianId.trim() === '') {
            errors.push('Cédula ecuatoriana es requerida');
        }

        if (!data.phone || data.phone.trim() === '') {
            errors.push('Teléfono es requerido');
        }

        if (!data.address || data.address.trim() === '') {
            errors.push('Dirección es requerida');
        }

        if (!data.city || data.city.trim() === '') {
            errors.push('Ciudad es requerida');
        }

        if (!data.province || data.province.trim() === '') {
            errors.push('Provincia es requerida');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

export default new ClientManager();

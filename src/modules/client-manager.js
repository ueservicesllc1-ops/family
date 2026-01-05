// Client Manager Module - UPDATED WITH FAMILY MEMBERS MANAGEMENT
import { db, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, query, where, orderBy, Timestamp } from '../config/firebase-config.js';
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

            // Upload photo to B2 if provided
            if (photoFile) {
                photoUrl = await uploadToB2(photoFile, `client-${Date.now()}-${photoFile.name}`);
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
    async addFamilyMember(clientId, familyMemberData) {
        try {
            const clientRef = doc(db, 'clients', clientId);
            const clientDoc = await getDoc(clientRef);

            if (!clientDoc.exists()) {
                throw new Error('Client not found');
            }

            const client = clientDoc.data();

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
                createdAt: Timestamp.now()
            };

            // Add to family members array
            const familyMembers = client.consularRegistration?.familyMembers || [];
            familyMembers.push(familyMember);

            await updateDoc(clientRef, {
                'consularRegistration.familyMembers': familyMembers,
                updatedAt: Timestamp.now()
            });

            // Update local cache
            const index = this.clients.findIndex(c => c.id === clientId);
            if (index !== -1) {
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
            const clientRef = doc(db, 'clients', clientId);
            const clientDoc = await getDoc(clientRef);

            if (!clientDoc.exists()) {
                throw new Error('Client not found');
            }

            const client = clientDoc.data();
            const familyMembers = (client.consularRegistration?.familyMembers || [])
                .filter(fm => fm.id !== familyMemberId);

            await updateDoc(clientRef, {
                'consularRegistration.familyMembers': familyMembers,
                updatedAt: Timestamp.now()
            });

            // Update local cache
            const index = this.clients.findIndex(c => c.id === clientId);
            if (index !== -1) {
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
            const clientRef = doc(db, 'clients', clientId);
            const clientDoc = await getDoc(clientRef);

            if (!clientDoc.exists()) {
                throw new Error('Client not found');
            }

            let photoUrl = clientDoc.data().photoUrl;

            // Upload new photo if provided
            if (photoFile) {
                // Delete old photo if exists
                if (photoUrl) {
                    await deleteFromB2(photoUrl);
                }
                photoUrl = await uploadToB2(photoFile, `client-${Date.now()}-${photoFile.name}`);
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
                this.clients[index] = { ...this.clients[index], ...updatedData, id: clientId };
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

    // Get all clients
    async getAllClients() {
        try {
            const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            this.clients = [];
            snapshot.forEach(doc => {
                this.clients.push({ id: doc.id, ...doc.data() });
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
            const clientRef = doc(db, 'clients', clientId);
            const clientDoc = await getDoc(clientRef);

            if (clientDoc.exists()) {
                return { id: clientDoc.id, ...clientDoc.data() };
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

import { db, auth, onAuthStateChanged, collection, addDoc, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, updateDoc } from '../config/firebase-config.js';

class FamilyChat {
    constructor() {
        this.chatId = localStorage.getItem('family_chat_id');
        this.isOpen = false;
        this.messagesUnsub = null;
        this.init();
    }

    init() {
        this.injectHTML();
        this.cacheDOM();
        this.bindEvents();

        // Auto-fill name if logged in
        onAuthStateChanged(auth, (user) => {
            if (user && this.nameInput) {
                // Prefer display name, fallback to email (before @)
                const defaultName = user.displayName || user.email.split('@')[0];
                this.nameInput.value = defaultName;
                // Optional: Auto-start chat if we have a name could be annoying, so we just pre-fill.
            }
        });

        // If we have history, check for new messages even if closed
        if (this.chatId) {
            this.listenToMessages();
        }
    }

    injectHTML() {
        const div = document.createElement('div');
        div.innerHTML = `
            <!-- Chat Button -->
            <button id="chat-widget-btn" class="chat-widget-btn">
                <i class="fa-solid fa-comments"></i>
                <div id="chat-notification" class="chat-notification-dot"></div>
            </button>

            <!-- Chat Window -->
            <div id="chat-window" class="chat-window">
                <div class="chat-header">
                    <h3>Chat con Asesor</h3>
                    <div style="display:flex; gap:10px;">
                        <button id="chat-end-btn" class="chat-close" title="Terminar y Borrar" style="display:flex; align-items:center; justify-content:center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                        <button id="chat-close" class="chat-close" title="Cerrar" style="display:flex; align-items:center; justify-content:center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                
                <div id="chat-intro" class="chat-intro">
                    <h4>¡Hola! ¿En qué podemos ayudarte?</h4>
                    <p style="margin-bottom:15px; font-size:0.9rem; color:#64748b;">Déjanos tus datos para iniciar el chat.</p>
                    <input type="text" id="chat-name-input" class="input mb-2" placeholder="Tu Nombre" style="margin-bottom:10px; padding:10px; width:100%; border:1px solid #ccc; border-radius:8px;">
                    <button id="start-chat-btn" class="btn btn-primary" style="width:100%;">Iniciar Chat</button>
                </div>

                <div id="chat-messages" class="chat-messages" style="display:none;">
                    <!-- Messages go here -->
                </div>

                <div id="chat-input-area" class="chat-input-area" style="display:none;">
                    <input type="text" id="chat-input" class="chat-input" placeholder="Escribe un mensaje...">
                    <button id="chat-send" class="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    }

    cacheDOM() {
        this.btn = document.getElementById('chat-widget-btn');
        this.window = document.getElementById('chat-window');
        this.closeBtn = document.getElementById('chat-close');
        this.endBtn = document.getElementById('chat-end-btn'); // New
        this.intro = document.getElementById('chat-intro');
        this.messagesContainer = document.getElementById('chat-messages');
        this.inputArea = document.getElementById('chat-input-area');
        this.nameInput = document.getElementById('chat-name-input');
        this.startBtn = document.getElementById('start-chat-btn');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send');
        this.notif = document.getElementById('chat-notification');
    }

    bindEvents() {
        this.btn.addEventListener('click', () => this.toggleChat());
        this.closeBtn.addEventListener('click', () => this.toggleChat(false));
        this.endBtn.addEventListener('click', () => { // New
            if (confirm('¿Seguro quieres borrar el chat y terminar?')) this.endSession();
        });
        this.startBtn.addEventListener('click', () => this.startChat());

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Inactivity Timer
        ['mousemove', 'keypress', 'click', 'scroll'].forEach(evt => {
            document.addEventListener(evt, () => this.resetInactivityTimer());
        });
        this.resetInactivityTimer();
    }

    resetInactivityTimer() {
        if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);
        // 10 minutes = 600,000 ms
        this.inactivityTimeout = setTimeout(() => this.endSession(), 600000);
    }

    endSession() {
        if (this.chatId) {
            console.log('Chat session timed out due to inactivity.');
            localStorage.removeItem('family_chat_id');
            this.chatId = null;
            if (this.messagesUnsub) this.messagesUnsub();

            // Reset UI
            this.messagesContainer.innerHTML = '';
            this.intro.style.display = 'flex';
            this.messagesContainer.style.display = 'none';
            this.inputArea.style.display = 'none';
            this.notif.style.display = 'none';
            this.nameInput.value = '';

            // Close window
            this.isOpen = false;
            this.window.style.display = 'none';
        }
    }

    toggleChat(forceState) {
        this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
        this.window.style.display = this.isOpen ? 'flex' : 'none';

        if (this.isOpen) {
            this.notif.style.display = 'none';
            if (this.chatId) {
                this.showChatInterface();
                this.scrollToBottom();
            }
            this.resetInactivityTimer();
        }
    }

    async startChat() {
        const name = this.nameInput.value.trim();
        if (!name) return alert('Por favor ingresa tu nombre');

        this.startBtn.disabled = true;
        this.startBtn.textContent = 'Iniciando...';

        try {
            // Create Chat Doc
            const chatRef = await addDoc(collection(db, 'chats'), {
                customerName: name,
                startedAt: new Date(),
                lastMessage: 'Chat iniciado',
                lastMessageTime: new Date(),
                status: 'unread', // unread by advisor
                unreadCount: 0
            });

            this.chatId = chatRef.id;
            localStorage.setItem('family_chat_id', this.chatId);

            // Add initial system message
            await addDoc(collection(db, 'chats', this.chatId, 'messages'), {
                text: `Hola ${name}, un asesor te atenderá pronto.`,
                sender: 'system',
                timestamp: new Date()
            });

            this.showChatInterface();
            this.listenToMessages();

        } catch (e) {
            console.error(e);
            alert('Error al iniciar el chat');
        } finally {
            this.startBtn.disabled = false;
        }
    }

    showChatInterface() {
        this.intro.style.display = 'none';
        this.messagesContainer.style.display = 'flex';
        this.inputArea.style.display = 'flex';
    }

    listenToMessages() {
        if (!this.chatId) return;

        // Ensure interface is correct if we re-loaded page with existing chat
        if (this.intro.style.display !== 'none') {
            this.showChatInterface();
        }

        const q = query(collection(db, 'chats', this.chatId, 'messages'), orderBy('timestamp', 'asc'));

        this.messagesUnsub = onSnapshot(q, (snapshot) => {
            this.messagesContainer.innerHTML = '';

            snapshot.forEach(doc => {
                const msg = doc.data();
                this.renderMessage(msg);
            });

            this.scrollToBottom();

            // Simple notification if closed
            // Check last message
            if (!this.isOpen && !snapshot.empty) {
                const last = snapshot.docs[snapshot.docs.length - 1].data();
                if (last.sender === 'advisor') {
                    this.notif.style.display = 'block';
                }
            }
        });
    }

    renderMessage(msg) {
        const div = document.createElement('div');
        let type = 'user';
        if (msg.sender === 'advisor') type = 'advisor';
        if (msg.sender === 'system') type = 'advisor'; // styled like advisor

        div.className = `message ${type}`;

        const time = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        div.innerHTML = `
            ${msg.text}
            <span class="message-time">${time}</span>
        `;
        this.messagesContainer.appendChild(div);
    }

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text || !this.chatId) return;

        this.input.value = '';

        try {
            await addDoc(collection(db, 'chats', this.chatId, 'messages'), {
                text: text,
                sender: 'user',
                timestamp: new Date()
            });

            // Update parent chat doc
            const chatRef = doc(db, 'chats', this.chatId);
            await updateDoc(chatRef, {
                lastMessage: text,
                lastMessageTime: new Date(),
                status: 'unread'
            });

        } catch (e) {
            console.error('Error sending message', e);
        }
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.familyChat = new FamilyChat();
        window.toggleChat = (state) => window.familyChat.toggleChat(state);
    });
} else {
    window.familyChat = new FamilyChat();
    window.toggleChat = (state) => window.familyChat.toggleChat(state);
}

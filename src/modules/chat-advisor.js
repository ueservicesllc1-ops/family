import { db, collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from '../config/firebase-config.js';

let currentChatId = null;
let messagesUnsubscribe = null;
let currentCustomerName = 'Cliente'; // Restore missing variable

// DOM Elements
const chatsContainer = document.getElementById('chats-container');
const emptyState = document.getElementById('empty-state');
const activeChatUI = document.getElementById('active-chat-ui');
const customerNameEl = document.getElementById('chat-customer-name');
const messagesDisplay = document.getElementById('messages-display');
const input = document.getElementById('advisor-input');
const sendBtn = document.getElementById('advisor-send');

// Init
function init() {
    loadChatList();
    bindEvents();
}

function bindEvents() {
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Expose delete global
    window.deleteCurrentChat = async () => {
        if (!currentChatId) return;
        if (confirm('¿Estás seguro de finalizar y eliminar este chat?')) {
            try {
                // Ideally delete subcollection messages too, but client SDK can't delete collections easily.
                // We'll delete parent doc, and UI will update.
                await deleteDoc(doc(db, 'chats', currentChatId));
                currentChatId = null;
                showEmptyState();
            } catch (e) {
                alert('Error: ' + e.message);
            }
        }
    };
}

function loadChatList() {
    const q = query(collection(db, 'chats'), orderBy('lastMessageTime', 'desc'));

    onSnapshot(q, (snapshot) => {
        chatsContainer.innerHTML = '';
        if (snapshot.empty) {
            chatsContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">No hay chats activos.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const chat = doc.data();
            renderChatItem(doc.id, chat);
        });
    });
}

function renderChatItem(id, chat) {
    const div = document.createElement('div');
    const isUnread = chat.status === 'unread';
    const isActive = id === currentChatId;

    div.className = `chat-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`;

    // Time format
    let timeStr = '';
    if (chat.lastMessageTime) {
        timeStr = new Date(chat.lastMessageTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    div.innerHTML = `
        <div class="c-name" style="font-weight:700; display:flex; align-items:center; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                <i class="fa-solid fa-circle-user" style="color:#94a3b8; font-size:1.5rem;"></i>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${chat.customerName || 'Cliente'}</span>
            </div>
            <span class="c-time" style="font-weight:400; font-size:0.7rem; min-width:fit-content;">${timeStr}</span>
        </div>
        <div class="c-preview" style="margin-left:32px; color:#64748b;">${chat.lastMessage || '...'}</div>
    `;

    div.addEventListener('click', () => selectChat(id, chat));
    chatsContainer.appendChild(div);
}

function selectChat(id, chat) {
    if (currentChatId === id) return;

    try {
        currentChatId = id;
        currentCustomerName = chat.customerName || 'Cliente';

        // 1. Immediate UI Feedback
        document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
        // Find the clicked element by ID if possible, or we rely on the render rebuild. 
        // Since we can't easily grab the specific DOM element here without passing it, 
        // we'll rely on the snapshot update OR we can try to find it by text/index, but simpler to just show the chat pane first.

        showActiveChat();

        if (customerNameEl) customerNameEl.textContent = currentCustomerName;

        // 2. Message Listener
        if (messagesUnsubscribe) messagesUnsubscribe();

        const q = query(collection(db, 'chats', id, 'messages'), orderBy('timestamp', 'asc'));
        messagesUnsubscribe = onSnapshot(q, (snapshot) => {
            if (!messagesDisplay) return;
            messagesDisplay.innerHTML = '';
            snapshot.forEach(doc => {
                renderMessage(doc.data());
            });
            scrollToBottom();
        });

        // 3. Mark Read
        updateDoc(doc(db, 'chats', id), {
            status: 'read'
        }).catch(err => console.error("Error marking read", err));

    } catch (e) {
        console.error("Error selecting chat:", e);
        alert("Error al abrir chat: " + e.message);
    }
}

function renderMessage(msg) {
    const div = document.createElement('div');
    let type = 'customer';
    if (msg.sender === 'advisor' || msg.sender === 'system') type = 'advisor';

    div.className = `msg-bubble ${type}`;

    // Optional timestamp tooltip
    if (msg.timestamp) {
        const t = new Date(msg.timestamp.seconds * 1000).toLocaleString();
        div.title = t;
    }

    div.innerHTML = `
        <span class="msg-label">${type === 'customer' ? currentCustomerName : 'Tú'}</span>
        ${msg.text}
    `;

    messagesDisplay.appendChild(div);
}

async function sendMessage() {
    const text = input.value.trim();
    if (!text || !currentChatId) return;

    input.value = '';

    try {
        await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
            text: text,
            sender: 'advisor',
            timestamp: new Date()
        });

        await updateDoc(doc(db, 'chats', currentChatId), {
            lastMessage: `Asesor: ${text}`,
            lastMessageTime: new Date(),
            status: 'read' // advisor replied, so it's read by advisor
        });

    } catch (e) {
        console.error('Error sending:', e);
        alert('Error al enviar mensaje');
    }
}

function showEmptyState() {
    emptyState.style.display = 'flex';
    activeChatUI.style.display = 'none';
    if (messagesUnsubscribe) {
        messagesUnsubscribe();
        messagesUnsubscribe = null;
    }
}

function showActiveChat() {
    emptyState.style.display = 'none';
    activeChatUI.style.display = 'flex';
}

function scrollToBottom() {
    messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
}

init();

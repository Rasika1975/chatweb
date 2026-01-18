const API_URL = 'http://localhost:8080';
let stompClient = null;
let currentUserId = null;
let currentReceiverId = null;
let currentUsername = null;
let unreadCounts = {};
let typingTimeout = null;

// Initialize
window.onload = function() {
    currentUserId = localStorage.getItem('userId');
    currentUsername = localStorage.getItem('username');

    if (!currentUserId) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('currentUser').innerText = currentUsername;
    loadUsers();
    connectWebSocket();
    startHeartbeat();
    requestNotificationPermission();
};

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Show browser notification
function showNotification(username, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`💬 ${username}`, {
            body: message,
            icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
            tag: 'chat-message'
        });

        playNotificationSound();

        notification.onclick = function() {
            window.focus();
            notification.close();
        };

        setTimeout(() => notification.close(), 5000);
    }
}

// Play notification sound
function playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGmi77eSTRAsMUKbj8LZjGwY5k9n0zXosBS13yPDdi0AKFF+06eunVRQKRp/g8r5sIAUsgs/y2Ik1CBpouuzkk0QKDFBM5/LN');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Sound play failed:', e));
}

// Heartbeat - update last seen
function startHeartbeat() {
    setInterval(async () => {
        if (currentUserId) {
            try {
                await fetch(`${API_URL}/heartbeat/${currentUserId}`, { method: 'POST' });
            } catch (error) {
                console.error('Heartbeat error:', error);
            }
        }
    }, 30000);
}

// Load all users with unread counts
async function loadUsers() {
    try {
        console.log('🔄 Loading users...');

        const response = await fetch(`${API_URL}/users`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const users = await response.json();
        console.log('✅ Users loaded:', users);

        const userList = document.getElementById('userList');
        userList.innerHTML = '';

        if (users.length === 0) {
            userList.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">No users found</div>';
            return;
        }

        for (const user of users) {
            if (user.id != currentUserId) {
                const unread = await getUnreadCount(user.id);
                unreadCounts[user.id] = unread;

                const userDiv = document.createElement('div');
                userDiv.className = 'user-item';
                userDiv.id = `user-${user.id}`;

                userDiv.addEventListener('click', function() {
                    selectUser(user.id, user.username, userDiv);
                });

                let statusText = '';
                if (user.status === 'ONLINE') {
                    statusText = '<span class="status online">● Online</span>';
                } else if (user.lastSeen) {
                    const lastSeen = getRelativeTime(user.lastSeen);
                    statusText = `<span class="status">Last seen ${lastSeen}</span>`;
                } else {
                    statusText = '<span class="status">○ Offline</span>';
                }

                userDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${user.username}</strong>
                            ${statusText}
                        </div>
                        ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
                    </div>
                `;

                userList.appendChild(userDiv);
            }
        }

        console.log('✅ User list rendered');

    } catch (error) {
        console.error('❌ Error loading users:', error);
        document.getElementById('userList').innerHTML =
            '<div style="padding:20px; text-align:center; color:red;">Error loading users</div>';
    }
}

// Get unread count
async function getUnreadCount(senderId) {
    try {
        const response = await fetch(`${API_URL}/messages/unread/${currentUserId}/${senderId}`);
        return await response.json();
    } catch (error) {
        return 0;
    }
}

// Calculate relative time
function getRelativeTime(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Select user
async function selectUser(userId, username, element) {
    console.log('👤 Selected user:', username, 'ID:', userId);

    currentReceiverId = userId;
    document.getElementById('chatWith').innerText = `Chat with ${username}`;

    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });

    if (element) {
        element.classList.add('active');
    }

    await markAsRead(userId);
    updateUnreadBadge(userId, 0);
    loadChatHistory();
}

// Mark as read
async function markAsRead(senderId) {
    try {
        await fetch(`${API_URL}/messages/read/${currentUserId}/${senderId}`, {
            method: 'PUT'
        });
    } catch (error) {
        console.error('Error marking as read:', error);
    }
}

// Update unread badge
function updateUnreadBadge(userId, count) {
    unreadCounts[userId] = count;
    const userDiv = document.getElementById(`user-${userId}`);
    if (userDiv) {
        const badge = userDiv.querySelector('.unread-badge');
        if (count > 0) {
            if (badge) {
                badge.textContent = count;
            } else {
                const div = userDiv.querySelector('div');
                if (div) {
                    const newBadge = document.createElement('span');
                    newBadge.className = 'unread-badge';
                    newBadge.textContent = count;
                    div.appendChild(newBadge);
                }
            }
        } else {
            if (badge) badge.remove();
        }
    }
}

// Load chat history
async function loadChatHistory() {
    if (!currentReceiverId) return;

    try {
        console.log('📜 Loading chat history...');

        const response = await fetch(`${API_URL}/messages/${currentUserId}/${currentReceiverId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const messages = await response.json();
        console.log('✅ Messages loaded:', messages.length);

        const messageArea = document.getElementById('messageArea');
        messageArea.innerHTML = '';

        if (messages.length === 0) {
            messageArea.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">No messages yet. Start the conversation! 💬</div>';
        }

        messages.forEach(msg => {
            displayMessage(msg, false);
        });

        messageArea.scrollTop = messageArea.scrollHeight;
    } catch (error) {
        console.error('❌ Error loading history:', error);
    }
}

// Connect WebSocket
function connectWebSocket() {
    console.log('🔌 Connecting to WebSocket...');

    const socket = new SockJS(`${API_URL}/chat`);
    stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, function(frame) {
        console.log('✅ WebSocket Connected');

        stompClient.subscribe('/topic/messages', function(message) {
            const msg = JSON.parse(message.body);
            console.log('📨 Received message:', msg);

            if ((msg.senderId == currentUserId && msg.receiverId == currentReceiverId) ||
                (msg.senderId == currentReceiverId && msg.receiverId == currentUserId)) {
                displayMessage(msg, true);
            }

            if (msg.receiverId == currentUserId && msg.senderId != currentReceiverId) {
                const currentCount = unreadCounts[msg.senderId] || 0;
                updateUnreadBadge(msg.senderId, currentCount + 1);
            }
        });

        stompClient.subscribe('/topic/typing', function(message) {
            const data = JSON.parse(message.body);
            if (data.senderId == currentReceiverId && data.receiverId == currentUserId) {
                showTypingIndicator(data.isTyping);
            }
        });
    }, function(error) {
        console.error('❌ WebSocket error:', error);
    });
}

// Show typing indicator
function showTypingIndicator(isTyping) {
    const messageArea = document.querySelector('.messages');
    let indicator = document.getElementById('typingIndicator');

    if (isTyping) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'typingIndicator';
            indicator.className = 'typing-indicator';
            indicator.innerHTML = '<span></span><span></span><span></span>';
            messageArea.appendChild(indicator);
        }
        indicator.style.display = 'flex';
        messageArea.scrollTop = messageArea.scrollHeight;
    } else {
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
}

// Send typing indicator
function sendTypingIndicator(isTyping) {
    if (stompClient && stompClient.connected && currentReceiverId) {
        stompClient.send("/app/typing", {}, JSON.stringify({
            senderId: parseInt(currentUserId),
            receiverId: parseInt(currentReceiverId),
            isTyping: isTyping
        }));
    }
}

// Handle typing in message input
const messageInput = document.getElementById('messageText');
if (messageInput) {
    messageInput.addEventListener('input', function() {
        sendTypingIndicator(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            sendTypingIndicator(false);
        }, 1000);
    });
}

// Send message
function sendMessage() {
    const content = document.getElementById('messageText').value.trim();

    if (!content) {
        alert('⚠️ Please type a message');
        return;
    }

    if (!currentReceiverId) {
        alert('⚠️ Please select a user first');
        return;
    }

    if (!stompClient || !stompClient.connected) {
        alert('⚠️ Connection lost. Refresh page.');
        return;
    }

    const message = {
        senderId: parseInt(currentUserId),
        receiverId: parseInt(currentReceiverId),
        content: content,
        status: 'SENT'
    };

    console.log('📤 Sending message:', message);
    stompClient.send("/app/send", {}, JSON.stringify(message));
    document.getElementById('messageText').value = '';
    sendTypingIndicator(false);
}

// Display message
function displayMessage(msg, showNotif) {
    const messageArea = document.getElementById('messageArea');

    const noMsgDiv = messageArea.querySelector('div[style*="No messages"]');
    if (noMsgDiv) noMsgDiv.remove();

    const messageDiv = document.createElement('div');
    const isSent = msg.senderId == currentUserId;
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;

    const time = msg.time ? new Date(msg.time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    }) : 'now';

    let statusIcon = '';
    if (isSent) {
        if (msg.status === 'SEEN' || msg.isRead) {
            statusIcon = '<span class="seen-tick">✓✓</span>';
        } else {
            statusIcon = '<span class="sent-tick">✓</span>';
        }
    }

    messageDiv.innerHTML = `
        <div class="message-content">
            ${msg.content}
            <div class="message-time">${time} ${statusIcon}</div>
        </div>
    `;

    messageArea.appendChild(messageDiv);
    messageArea.scrollTop = messageArea.scrollHeight;

    if (!isSent && showNotif && msg.senderId != currentUserId) {
        fetch(`${API_URL}/users/${msg.senderId}`)
            .then(res => res.json())
            .then(user => {
                showNotification(user.username, msg.content);
            })
            .catch(err => console.error('Notification error:', err));
    }
}

// Logout
async function logout() {
    try {
        await fetch(`${API_URL}/logout/${currentUserId}`, { method: 'POST' });
        console.log('👋 Logged out');
    } catch (error) {
        console.error('Logout error:', error);
    }

    localStorage.clear();
    window.location.href = 'index.html';
}
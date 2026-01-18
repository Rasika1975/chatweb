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
    
    // 🔥 ATTACH IMAGE UPLOAD LISTENER
    attachImageUploadListener();
};

// Check WebSocket connection status
function checkWebSocketConnection() {
    if (!stompClient || !stompClient.connected) {
        console.log('⚠️ WebSocket disconnected. Reconnecting...');
        connectWebSocket();
        return false;
    }
    return true;
}

// 🔥 Attach image upload event listener
function attachImageUploadListener() {
    console.log('🎨 Attaching image upload listener...');
    
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
        console.log('✅ Image upload listener attached successfully');
    } else {
        console.error('❌ Image upload element NOT FOUND!');
        setTimeout(attachImageUploadListener, 1000); // Retry after 1 second
    }
}

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

// Heartbeat - keep connection alive
function startHeartbeat() {
    setInterval(async () => {
        if (currentUserId) {
            try {
                await fetch(`${API_URL}/heartbeat/${currentUserId}`, { method: 'POST' });
                
                // 🔥 Check WebSocket connection
                if (stompClient && !stompClient.connected) {
                    console.warn('⚠️ WebSocket disconnected during heartbeat. Reconnecting...');
                    connectWebSocket();
                }
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

// Connect WebSocket with reconnection
function connectWebSocket() {
    console.log('🔌 Connecting to WebSocket...');

    const socket = new SockJS(`${API_URL}/chat`);
    stompClient = Stomp.over(socket);
    stompClient.debug = null;

    // Store subscriptions to be applied after connection
    let subscriptionsActive = false;
    
    const setupSubscriptions = function() {
        if (subscriptionsActive) return; // Prevent duplicate subscriptions
        
        subscriptionsActive = true;
        
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
    };

    stompClient.connect({}, function(frame) {
        console.log('✅ WebSocket Connected');
        console.log('🔗 Connection status:', stompClient.connected);
        
        setTimeout(setupSubscriptions, 100);
    }, function(error) {
        console.error('❌ WebSocket connection error:', error);
        if (error && typeof error === 'object') {
            if (error.command) {
                console.error('STOMP command:', error.command);
            }
            if (error.headers) {
                console.error('STOMP headers:', error.headers);
            }
            if (error.body) {
                console.error('STOMP body:', error.body);
            }
        }
        console.log('🔄 Reconnecting in 3 seconds...');
        setTimeout(connectWebSocket, 3000);
    });
    
    // 🔥 Handle socket close event
    socket.onclose = function() {
        console.warn('⚠️ WebSocket closed. Connection lost...');
        subscriptionsActive = false; // Reset subscription flag
        setTimeout(connectWebSocket, 3000);
    };
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

// ========== IMAGE UPLOAD CODE START ==========

// Attach event listener when page loads
window.addEventListener('load', function() {
    console.log('🎨 Attaching image upload listener...');
    
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
        console.log('✅ Image upload listener attached');
    } else {
        console.error('❌ Image upload element not found!');
    }
});

// ========== IMAGE UPLOAD CODE END ==========

// 🔥 Handle image file selection
function handleImageUpload(event) {
    console.log('📷 Image upload triggered!');
    
    const file = event.target.files[0];
    
    if (!file) {
        console.log('⚠️ No file selected');
        return;
    }
    
    console.log('📁 File details:', {
        name: file.name,
        size: file.size + ' bytes',
        type: file.type
    });
    
    // Check if user is selected
    if (!currentReceiverId) {
        alert('⚠️ Please select a user first!');
        console.error('❌ No receiver selected');
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ Image too large! Maximum 5MB allowed');
        console.error('❌ File too large:', file.size);
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        alert('❌ Please select an image file!');
        console.error('❌ Invalid file type:', file.type);
        return;
    }
    
    console.log('✅ File validation passed');
    console.log('🔄 Converting to Base64...');
    
    // Convert to Base64
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const base64Image = e.target.result;
        console.log('✅ File converted to Base64');
        console.log('📦 Base64 length:', base64Image.length, 'characters');
        sendImageMessage(base64Image);
    };
    
    reader.onerror = function(error) {
        console.error('❌ FileReader error:', error);
        alert('❌ Error reading file!');
    };
    
    reader.readAsDataURL(file);
    
    // Clear input
    event.target.value = '';
    console.log('🧹 Input cleared for next upload');
}

// 🔥 Send image message via WebSocket
function sendImageMessage(base64Data) {
    console.log('📤 sendImageMessage() called');
    console.log('🔍 Checking WebSocket connection...');
    console.log('   stompClient exists:', !!stompClient);
    console.log('   stompClient.connected:', stompClient ? stompClient.connected : 'N/A');
    
    // Check and reconnect if needed
    if (!stompClient || !stompClient.connected) {
        console.error('❌ WebSocket not connected!');
        alert('⚠️ Connection lost. Reconnecting...');
        connectWebSocket();
        
        // Retry after 2 seconds
        setTimeout(() => {
            if (stompClient && stompClient.connected) {
                sendImageMessage(base64Data);
            } else {
                alert('❌ Failed to reconnect. Please refresh the page.');
            }
        }, 2000);
        return;
    }
    
    if (!currentReceiverId) {
        console.error('❌ No receiver selected!');
        alert('⚠️ Please select a user first!');
        return;
    }
    
    const message = {
        senderId: parseInt(currentUserId),
        receiverId: parseInt(currentReceiverId),
        content: '',
        messageType: 'IMAGE',
        imageData: base64Data,
        status: 'SENT',
        isRead: false
    };
    
    console.log('📦 Message object created:', {
        senderId: message.senderId,
        receiverId: message.receiverId,
        messageType: message.messageType,
        imageDataLength: base64Data.length
    });
    
    try {
        console.log('🚀 Sending via WebSocket...');
        stompClient.send("/app/send", {}, JSON.stringify(message));
        console.log('✅ Image message sent successfully!');
    } catch (error) {
        console.error('❌ Error sending image:', error);
        // Attempt to reconnect and retry
        connectWebSocket();
        setTimeout(() => {
            if (stompClient && stompClient.connected) {
                try {
                    stompClient.send("/app/send", {}, JSON.stringify(message));
                    console.log('✅ Image message sent after reconnection!');
                } catch (retryError) {
                    console.error('❌ Failed to send after reconnection:', retryError);
                    alert('❌ Failed to send image. Please try again.');
                }
            }
        }, 1000);
    }
}

// Update displayMessage function to handle images
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
    
    // 🔥 IMAGE HANDLING
    let messageContent = '';
    if (msg.messageType === 'IMAGE' && msg.imageData) {
        console.log('🖼️ Displaying image message');
        messageContent = `<img src="${msg.imageData}" class="message-image" onclick="openImageModal('${msg.imageData}')" alt="Image">`;
    } else {
        messageContent = msg.content || '';
    }

    messageDiv.innerHTML = `
        <div class="message-content">
            ${messageContent}
            <div class="message-time">${time} ${statusIcon}</div>
        </div>
    `;

    messageArea.appendChild(messageDiv);
    messageArea.scrollTop = messageArea.scrollHeight;
    
    // Notification
    if (!isSent && showNotif && msg.senderId != currentUserId) {
        fetch(`${API_URL}/users/${msg.senderId}`)
            .then(res => res.json())
            .then(user => {
                const notifText = msg.messageType === 'IMAGE' ? '📷 Sent an image' : msg.content;
                showNotification(user.username, notifText);
            })
            .catch(err => console.error('Notification error:', err));
    }
}

// Open image in modal
function openImageModal(imageSrc) {
    console.log('🖼️ Opening image modal');
    
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    
    if (modal && modalImage) {
        modalImage.src = imageSrc;
        modal.style.display = 'flex';
    }
}

// Close image modal
function closeImageModal() {
    console.log('❌ Closing image modal');
    
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;

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

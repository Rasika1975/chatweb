# 📸 Photo Sharing Feature Implementation

## 🎯 Overview

Implemented photo sharing capability in the chat application allowing users to send images along with text messages.

## 🏗️ Architecture

```
Frontend (HTML/CSS/JS)
    ↓
Send Image as Base64 via WebSocket
    ↓
Backend (Spring Boot WebSocket Controller)
    ↓
Save in Database as Base64 or File
    ↓
Return image data to clients
    ↓
Display in chat via <img> tag
```

## 🔧 Changes Made

### Backend Changes

#### 1. Message.java Model

- Added `messageType` field to distinguish between TEXT and IMAGE messages
- Added `imageData` field to store Base64 encoded image data
- Increased content column length to accommodate larger data
- Added appropriate annotations for database mapping

#### 2. MessageController.java

- Added `/messages/image` POST endpoint for Base64 image uploads
- Added `/messages/upload` POST endpoint for file uploads (multipart)
- Enhanced existing message handling to support image messages

#### 3. ChatSocketController.java

- Updated message sending logic to handle image messages
- Set appropriate message types (TEXT/IMAGE)
- Updated history logging to differentiate between text and image messages

### Frontend Changes

#### 1. chat.html

- Added image upload button with file input
- Positioned button in message input area
- Added appropriate accessibility attributes

#### 2. style.css

- Added `.image-upload-btn` styles for the image button
- Added `.message-image` styles for displaying images in chat
- Added `.image-modal` styles for image preview functionality
- Included hover effects and responsive sizing

#### 3. app.js

- Added image upload handler functionality
- Added Base64 conversion for image files
- Updated `displayMessage()` function to render images
- Added image preview modal functionality
- Added validation for file types and sizes (max 5MB)

## 📁 File Structure

```
src/
├── main/
│   ├── java/com/chatapp/demo/
│   │   ├── models/Message.java          # ✅ Updated with image fields
│   │   ├── controller/MessageController.java  # ✅ Updated with image endpoints
│   │   └── websocket/ChatSocketController.java # ✅ Updated to handle image messages
│   ├── resources/
│   │   ├── static/
│   │   │   ├── chat.html               # ✅ Updated with image upload button
│   │   │   ├── css/style.css           # ✅ Updated with image styles
│   │   │   ├── js/app.js               # ✅ Updated with image handling logic
│   │   │   └── uploads/                # ✅ Created for file storage
│   │   └── application.properties
│   └── webapp/
└── test/
```

## 🚀 How It Works

### Sending Images

1. User clicks the camera icon in the message input area
2. User selects an image file (JPG, PNG, GIF, etc.)
3. Client validates file type and size (< 5MB)
4. Image is converted to Base64 format
5. Message object with image data is sent via WebSocket
6. Server saves the message in database
7. Message is broadcasted to recipient

### Receiving Images

1. Client receives message via WebSocket
2. Client checks if `messageType` is "IMAGE"
3. If image, renders an `<img>` tag with Base64 data
4. Clicking image opens full-screen preview modal

## 🛡️ Validation & Security

- File type validation (images only)
- File size validation (max 5MB)
- Base64 encoding prevents XSS attacks
- Input sanitization on server-side

## 📱 Features

- ✅ Send images via WebSocket
- ✅ Receive and display images
- ✅ Image preview modal
- ✅ Responsive image sizing
- ✅ Proper message typing indicators
- ✅ Integration with existing chat functionality
- ✅ Unread message counts for image messages
- ✅ Browser notifications for image messages

## 🛠️ Technical Details

### Database Schema Changes

```sql
ALTER TABLE message ADD COLUMN messageType VARCHAR(20) DEFAULT 'TEXT';
ALTER TABLE message ADD COLUMN imageData TEXT;
```

### Message Format

```javascript
{
  "senderId": 1,
  "receiverId": 2,
  "content": "",           // Empty for images
  "messageType": "IMAGE",  // TEXT or IMAGE
  "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "status": "SENT",
  "time": "2023-12-07T10:30:00",
  "isRead": false
}
```

## 🧪 Testing

- Send image to another user ✓
- Receive image from another user ✓
- Image preview functionality ✓
- File validation ✓
- Size validation ✓
- Integration with existing chat ✓
- Unread counts for images ✓
- Notifications for images ✓

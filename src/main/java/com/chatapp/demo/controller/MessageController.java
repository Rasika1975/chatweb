package com.chatapp.demo.controller;

import com.chatapp.demo.models.Message;
import com.chatapp.demo.repositories.MessageRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@CrossOrigin("*")
public class MessageController {

    @Autowired
    private MessageRepo messageRepo;

    // 🔥 NEW - For broadcasting messages
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/messages/{user1}/{user2}")
    public List<Message> getChatHistory(@PathVariable int user1, @PathVariable int user2) {
        System.out.println("📜 Getting chat history: " + user1 + " <-> " + user2);
        return messageRepo.findChatHistory(user1, user2);
    }

    @GetMapping("/messages/{userId}")
    public List<Message> getUserMessages(@PathVariable int userId) {
        System.out.println("📨 Getting messages for user: " + userId);
        return messageRepo.findByReceiverId(userId);
    }

    @GetMapping("/messages/unread/{receiverId}/{senderId}")
    public long getUnreadCount(@PathVariable int receiverId, @PathVariable int senderId) {
        System.out.println("🔢 Getting unread count: receiver=" + receiverId + ", sender=" + senderId);
        long count = messageRepo.getUnreadCount(receiverId, senderId);
        System.out.println("   Unread count: " + count);
        return count;
    }

    @Transactional
    @PutMapping("/messages/read/{receiverId}/{senderId}")
    public String markAsRead(@PathVariable int receiverId, @PathVariable int senderId) {
        try {
            System.out.println("✓✓ Marking as read: receiver=" + receiverId + ", sender=" + senderId);
            messageRepo.markAsRead(receiverId, senderId);
            return "Messages marked as read";
        } catch (Exception e) {
            System.err.println("❌ Error marking as read: " + e.getMessage());
            e.printStackTrace();
            return "Error: " + e.getMessage();
        }
    }

    @PutMapping("/messages/seen/{id}")
    public String markAsSeen(@PathVariable int id) {
        try {
            Message msg = messageRepo.findById(id).orElse(null);
            if (msg != null) {
                msg.setStatus("SEEN");
                msg.setRead(true);
                messageRepo.save(msg);
                return "Marked as Seen";
            }
            return "Message Not Found";
        } catch (Exception e) {
            System.err.println("❌ Error marking as seen: " + e.getMessage());
            return "Error: " + e.getMessage();
        }
    }

    // 🔥 NEW - Base64 Image Endpoint with Broadcast
    @PostMapping("/messages/image")
    public Message sendImageMessage(@RequestBody Message message) {
        System.out.println("📷 Received image message via HTTP");
        System.out.println("   Sender: " + message.getSenderId());
        System.out.println("   Receiver: " + message.getReceiverId());
        System.out.println("   Image data length: " + (message.getImageData() != null ? message.getImageData().length() : 0));

        message.setTime(LocalDateTime.now());
        message.setStatus("SENT");
        message.setRead(false);
        message.setMessageType("IMAGE");

        Message saved = messageRepo.save(message);

        // 🔥 Broadcast to WebSocket subscribers
        System.out.println("📡 Broadcasting image message to /topic/messages");
        messagingTemplate.convertAndSend("/topic/messages", saved);

        System.out.println("✅ Image message saved and broadcasted");
        return saved;
    }

    // 🔥 NEW - Multipart File Upload with Broadcast
    @PostMapping("/messages/upload")
    public Message uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("senderId") int senderId,
            @RequestParam("receiverId") int receiverId) throws IOException {

        System.out.println("📤 File upload request received");
        System.out.println("   File: " + file.getOriginalFilename());
        System.out.println("   Size: " + file.getSize() + " bytes");
        System.out.println("   Sender: " + senderId);
        System.out.println("   Receiver: " + receiverId);

        String uploadDir = "src/main/resources/static/uploads/";
        File directory = new File(uploadDir);
        if (!directory.exists()) {
            directory.mkdirs();
            System.out.println("📁 Created uploads directory");
        }

        String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path path = Paths.get(uploadDir + filename);
        Files.write(path, file.getBytes());

        System.out.println("💾 File saved: " + filename);

        Message messageObj = new Message();
        messageObj.setSenderId(senderId);
        messageObj.setReceiverId(receiverId);
        messageObj.setContent("");
        messageObj.setMessageType("IMAGE");
        messageObj.setImageData("/uploads/" + filename);
        messageObj.setTime(LocalDateTime.now());
        messageObj.setStatus("SENT");
        messageObj.setRead(false);

        Message saved = messageRepo.save(messageObj);

        System.out.println("📡 Broadcasting uploaded image message to /topic/messages");
        messagingTemplate.convertAndSend("/topic/messages", saved);

        System.out.println("✅ Multipart image message saved and broadcasted");
        return saved;
    }
}

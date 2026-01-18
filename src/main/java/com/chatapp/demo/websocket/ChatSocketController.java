package com.chatapp.demo.websocket;

import com.chatapp.demo.models.History;
import com.chatapp.demo.models.Message;
import com.chatapp.demo.repositories.HistoryRepo;
import com.chatapp.demo.repositories.MessageRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Controller
public class ChatSocketController {

    @Autowired
    private MessageRepo messageRepo;

    @Autowired
    private HistoryRepo historyRepo;

    // Real-time message send
    @MessageMapping("/send")
    @SendTo("/topic/messages")
    public Message sendMessage(Message msg) {
        msg.setTime(LocalDateTime.now());
        msg.setStatus("SENT");
        msg.setRead(false); // 🆕 NEW

        // Set message type if not provided
        if (msg.getMessageType() == null) {
            msg.setMessageType("TEXT");
        }

        messageRepo.save(msg);

        // History maintain
        History h = new History();
        h.setUserId(msg.getSenderId());
        h.setAction(msg.getMessageType().equals("IMAGE") ? "IMAGE_SENT" : "MESSAGE_SENT");
        h.setDetails("Message to user " + msg.getReceiverId());
        h.setTimestamp(LocalDateTime.now());
        historyRepo.save(h);

        return msg;
    }

    // 🆕 NEW - Typing indicator
    @MessageMapping("/typing")
    @SendTo("/topic/typing")
    public Map<String, Object> typing(Map<String, Object> payload) {
        return payload; // { senderId, receiverId, isTyping }
    }
}
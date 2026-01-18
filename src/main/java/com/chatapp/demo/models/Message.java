package com.chatapp.demo.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private int senderId;
    private int receiverId;

    @Column(length = 1000)
    private String content; // Text message

    private String status; // SENT / DELIVERED / SEEN
    private LocalDateTime time;
    private boolean isRead;

    private String messageType; // TEXT / IMAGE

    @Lob
    private String imageData; // Base64 encoded image
}

package com.chatapp.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatDto {
    private int userId;
    private String username;
    private String lastMessage;
    private String time;
    private String status;
}
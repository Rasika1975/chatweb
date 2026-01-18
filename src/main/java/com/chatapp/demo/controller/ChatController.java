package com.chatapp.demo.controller;

import com.chatapp.demo.models.User;
import com.chatapp.demo.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@CrossOrigin("*")
public class ChatController {

    @Autowired
    private UserRepo userRepo;
    // Get all users (VBS style)
    @GetMapping("/users")
    public List<User> getAllUsers() {
        System.out.println("📋 Fetching all users...");
        List<User> users = userRepo.findAll();
        System.out.println("✅ Found " + users.size() + " users");
        return users;
    }

    // Get user by ID
    @GetMapping("/users/{id}")
    public User getUserById(@PathVariable int id) {
        System.out.println("🔍 Fetching user with ID: " + id);
        return userRepo.findById(id).orElse(null);
    }

    // Get online users only
    @GetMapping("/users/online")
    public List<User> getOnlineUsers() {
        System.out.println("🟢 Fetching online users...");
        return userRepo.findAll().stream()
                .filter(u -> "ONLINE".equals(u.getStatus()))
                .toList();
    }
}
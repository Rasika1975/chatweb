package com.chatapp.demo.repositories;

import com.chatapp.demo.models.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageRepo extends JpaRepository<Message, Integer> {

    @Query("SELECT m FROM Message m WHERE (m.senderId = ?1 AND m.receiverId = ?2) OR (m.senderId = ?2 AND m.receiverId = ?1) ORDER BY m.time")
    List<Message> findChatHistory(int user1, int user2);

    List<Message> findByReceiverId(int receiverId);

    // 🆕 NEW - Unread messages count
    @Query("SELECT COUNT(m) FROM Message m WHERE m.receiverId = ?1 AND m.senderId = ?2 AND m.isRead = false")
    int getUnreadCount(int receiverId, int senderId);

    // 🆕 NEW - Mark messages as read
    @Query("UPDATE Message m SET m.isRead = true, m.status = 'SEEN' WHERE m.receiverId = ?1 AND m.senderId = ?2")
    void markAsRead(int receiverId, int senderId);
}
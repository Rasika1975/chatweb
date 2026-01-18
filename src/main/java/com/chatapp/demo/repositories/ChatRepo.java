package com.chatapp.demo.repositories;

import com.chatapp.demo.models.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRepo extends JpaRepository<Chat, Integer> {

    @Query("SELECT c FROM Chat c WHERE c.user1Id = ?1 OR c.user2Id = ?1")
    List<Chat> findChatsByUserId(int userId);

    @Query("SELECT c FROM Chat c WHERE (c.user1Id = ?1 AND c.user2Id = ?2) OR (c.user1Id = ?2 AND c.user2Id = ?1)")
    Optional<Chat> findChatBetweenUsers(int user1, int user2);
}
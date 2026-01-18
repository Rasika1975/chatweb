package com.chatapp.demo.repositories;

import com.chatapp.demo.models.History;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface HistoryRepo extends JpaRepository<History, Integer> {
    List<History> findByUserId(int userId);
}
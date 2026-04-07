package com.mermaid.app.repository;

import com.mermaid.app.domain.Message;
import com.mermaid.app.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE (m.sender.id = :user1Id AND m.recipient.id = :user2Id) " +
           "OR (m.sender.id = :user2Id AND m.recipient.id = :user1Id) ORDER BY m.sentAt ASC")
    List<Message> findConversation(Long user1Id, Long user2Id);

    @Query("SELECT DISTINCT u FROM User u WHERE " +
           "u.id IN (SELECT m.recipient.id FROM Message m WHERE m.sender.id = :userId) " +
           "OR u.id IN (SELECT m.sender.id FROM Message m WHERE m.recipient.id = :userId)")
    List<User> findUsersWithConversations(Long userId);
}

package com.mermaid.app.service;

import com.mermaid.app.domain.Message;
import com.mermaid.app.domain.User;
import com.mermaid.app.repository.MessageRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessageService(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    public List<User> getChatContacts(Long userId) {
        return messageRepository.findUsersWithConversations(userId);
    }

    public List<Message> getConversation(Long userId, Long otherUserId) {
        return messageRepository.findConversation(userId, otherUserId);
    }

    @Transactional
    public Message saveMessage(Long senderId, Long recipientId, String content) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid sender"));
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid recipient"));

        Message message = new Message();
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setContent(content);

        return messageRepository.save(message);
    }
}

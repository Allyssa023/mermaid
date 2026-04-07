package com.mermaid.app.controller;

import com.mermaid.app.domain.Message;
import com.mermaid.app.domain.User;
import com.mermaid.app.model.ChatMessage;
import com.mermaid.app.model.UserSummary;
import com.mermaid.app.model.Role;
import com.mermaid.app.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/messages")
public class ChatController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtDecoder jwtDecoder;

    public ChatController(MessageService messageService, 
                          SimpMessagingTemplate messagingTemplate,
                          JwtDecoder jwtDecoder) {
        this.messageService = messageService;
        this.messagingTemplate = messagingTemplate;
        this.jwtDecoder = jwtDecoder;
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserSummary>> getChatUsers() {
        Long currentUserId = getCurrentUserId();
        List<User> users = messageService.getChatContacts(currentUserId);
        
        List<UserSummary> summaries = users.stream().map(u -> {
            UserSummary summary = new UserSummary();
            summary.setId(u.getId());
            summary.setFullName(u.getFullName());
            summary.setEmail(u.getEmail());
            summary.setRole(Role.valueOf(u.getRole().name()));
            summary.setActive(u.isActive());
            return summary;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(summaries);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<ChatMessage>> getConversation(@PathVariable Long userId) {
        Long currentUserId = getCurrentUserId();
        List<Message> messages = messageService.getConversation(currentUserId, userId);
        
        List<ChatMessage> chatMessages = messages.stream().map(this::mapToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(chatMessages);
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage chatMessage, @Header("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            authHeader = authHeader.substring(7);
        }
        Jwt jwt = jwtDecoder.decode(authHeader);
        Long senderId = Long.parseLong(jwt.getSubject());
        
        Message savedMessage = messageService.saveMessage(
                senderId, 
                chatMessage.getRecipientId(), 
                chatMessage.getContent()
        );
        
        ChatMessage dto = mapToDTO(savedMessage);
        
        messagingTemplate.convertAndSendToUser(
                String.valueOf(chatMessage.getRecipientId()),
                "/queue/messages", 
                dto
        );
        
        messagingTemplate.convertAndSendToUser(
                String.valueOf(senderId),
                "/queue/messages", 
                dto
        );
    }

    private ChatMessage mapToDTO(Message entity) {
        ChatMessage dto = new ChatMessage();
        dto.setId(entity.getId());
        dto.setSenderId(entity.getSender().getId());
        dto.setRecipientId(entity.getRecipient().getId());
        dto.setContent(entity.getContent());
        dto.setSentAt(entity.getSentAt());
        dto.setRead(entity.isRead());
        return dto;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return Long.parseLong(auth.getName());
    }
}

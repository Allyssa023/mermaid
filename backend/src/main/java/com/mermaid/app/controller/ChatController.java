package com.mermaid.app.controller;

import com.mermaid.app.domain.Message;
import com.mermaid.app.domain.User;
import com.mermaid.app.mapper.DealMapper;
import com.mermaid.app.model.ChatMessage;
import com.mermaid.app.model.UserSummary;
import com.mermaid.app.model.Role;
import com.mermaid.app.service.MessageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/messages")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final DealMapper dealMapper;

    public ChatController(MessageService messageService,
                          SimpMessagingTemplate messagingTemplate,
                          DealMapper dealMapper) {
        this.messageService = messageService;
        this.messagingTemplate = messagingTemplate;
        this.dealMapper = dealMapper;
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
    public void sendMessage(@Payload ChatMessage chatMessage, java.security.Principal principal) {
        if (principal == null || principal.getName() == null) {
            log.warn("Dropping chat frame: unauthenticated STOMP session");
            return;
        }
        Long senderId = Long.parseLong(principal.getName());

        Long dealId = chatMessage.getDealId() != null && chatMessage.getDealId().isPresent()
                ? chatMessage.getDealId().get()
                : null;

        Message savedMessage = messageService.saveMessage(
                senderId,
                chatMessage.getRecipientId(),
                chatMessage.getContent(),
                dealId
        );

        ChatMessage dto = dealMapper.toChatMessage(savedMessage);

        Long recipientId = savedMessage.getRecipient().getId();
        messagingTemplate.convertAndSendToUser(
                String.valueOf(recipientId),
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
        return dealMapper.toChatMessage(entity);
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return Long.parseLong(auth.getName());
    }
}

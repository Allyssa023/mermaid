package com.mermaid.app.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mermaid.app.domain.Notification;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.NotificationRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepo;
    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate ws;

    public NotificationService(NotificationRepository notificationRepo, ObjectMapper objectMapper, SimpMessagingTemplate ws) {
        this.notificationRepo = notificationRepo;
        this.objectMapper = objectMapper;
        this.ws = ws;
    }

    @Transactional
    public Notification create(Long userId, String type, String body, Map<String, Object> payload) {
        return create(userId, type, body, payload, null);
    }

    @Transactional
    public Notification create(Long userId, String type, String body, Map<String, Object> payload, String link) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(type);
        n.setBody(body);
        n.setLink(link);
        if (payload != null) {
            try {
                n.setPayloadJson(objectMapper.writeValueAsString(payload));
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Failed to serialize notification payload", e);
            }
        }
        Notification saved = notificationRepo.save(n);
        sendLiveNotification(userId, saved);
        return saved;
    }

    @Transactional
    public Notification notify(Long userId, String type, String title, String body, String link) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title);
        n.setBody(body);
        n.setLink(link);
        Notification saved = notificationRepo.save(n);
        sendLiveNotification(userId, saved);
        return saved;
    }

    private void sendLiveNotification(Long userId, Notification n) {
        if (userId == null) return;
        runAfterCommit(() -> {
            try {
                ws.convertAndSendToUser(userId.toString(), "/queue/notifications", Map.of(
                    "id", n.getId(),
                    "type", n.getType(),
                    "title", n.getTitle() == null ? "" : n.getTitle(),
                    "body", n.getBody() == null ? "" : n.getBody(),
                    "link", n.getLink() == null ? "" : n.getLink(),
                    "createdAt", n.getCreatedAt() == null ? OffsetDateTime.now().toString() : n.getCreatedAt().toString()
                ));
            } catch (Exception e) {
                // Defensive: prevent websocket failures from rollback of database transaction
            }
        });
    }

    private void runAfterCommit(Runnable r) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    r.run();
                }
            });
        } else {
            r.run();
        }
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.Notification> getNotifications(Long userId, boolean unreadOnly, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<Notification> result;
        if (unreadOnly) {
            result = notificationRepo.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, pageable);
        } else {
            result = notificationRepo.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return result.getContent().stream().map(this::toModel).toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepo.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public void markRead(Long notificationId, Long userId) {
        Notification n = notificationRepo.findById(notificationId)
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));
        if (!n.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Notification not found: " + notificationId);
        }
        if (n.getReadAt() == null) {
            n.setReadAt(OffsetDateTime.now());
            notificationRepo.save(n);
        }
    }

    @Transactional
    public void markAllRead(Long userId) {
        notificationRepo.markAllReadByUserId(userId, OffsetDateTime.now());
    }

    @Transactional(readOnly = true)
    public boolean existsByUserAndCatchAlertId(Long userId, Long catchAlertId) {
        return notificationRepo.existsByCatchAlertNotification(userId, catchAlertId);
    }

    private com.mermaid.app.model.Notification toModel(Notification entity) {
        com.mermaid.app.model.Notification m = new com.mermaid.app.model.Notification(
            entity.getId(),
            com.mermaid.app.model.Notification.TypeEnum.fromValue(entity.getType()),
            entity.getTitle(),
            entity.getBody(),
            entity.getCreatedAt()
        );
        m.setLink(JsonNullable.of(entity.getLink()));
        m.setReadAt(JsonNullable.of(entity.getReadAt()));
        return m;
    }
}

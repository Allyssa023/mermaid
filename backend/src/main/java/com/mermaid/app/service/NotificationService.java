package com.mermaid.app.service;

import com.mermaid.app.domain.Notification;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.NotificationRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepo;

    public NotificationService(NotificationRepository notificationRepo) {
        this.notificationRepo = notificationRepo;
    }

    /**
     * Create and persist a notification for a user.
     */
    @Transactional
    public Notification notify(Long userId, String type, String title, String body, String link) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title);
        n.setBody(body);
        n.setLink(link);
        return notificationRepo.save(n);
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

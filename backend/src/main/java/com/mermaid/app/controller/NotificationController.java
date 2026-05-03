package com.mermaid.app.controller;

import com.mermaid.app.model.Notification;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<Notification>> getNotifications(
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(notificationService.getNotifications(userId, unreadOnly, page, size));
    }

    @PutMapping("/notifications/{notificationId}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long notificationId) {
        Long userId = SecurityUtils.currentUserId();
        notificationService.markRead(notificationId, userId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/notifications/read-all")
    public ResponseEntity<Void> markAllRead() {
        Long userId = SecurityUtils.currentUserId();
        notificationService.markAllRead(userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        Long userId = SecurityUtils.currentUserId();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }
}

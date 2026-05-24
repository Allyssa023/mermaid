package com.mermaid.app.service;

import com.mermaid.app.domain.Notification;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock NotificationRepository notificationRepo;
    @Mock SimpMessagingTemplate ws;
    @InjectMocks NotificationService service;

    @Test
    void notify_savesNotification() {
        Notification saved = notification(1L, 42L, "ORDER_STATUS", "Title", "Body");
        when(notificationRepo.save(any())).thenReturn(saved);

        Notification result = service.notify(42L, "ORDER_STATUS", "Title", "Body", "/link");

        verify(notificationRepo).save(argThat(n ->
            n.getUserId().equals(42L) &&
            n.getType().equals("ORDER_STATUS") &&
            n.getTitle().equals("Title") &&
            n.getBody().equals("Body") &&
            "/link".equals(n.getLink())
        ));
    }

    @Test
    void getNotifications_allReturnsPage() {
        Notification n1 = notification(1L, 42L, "ORDER_STATUS", "T1", "B1");
        when(notificationRepo.findByUserIdOrderByCreatedAtDesc(eq(42L), any()))
            .thenReturn(new PageImpl<>(List.of(n1)));

        var result = service.getNotifications(42L, false, 0, 20);
        assertEquals(1, result.size());
        assertEquals("T1", result.get(0).getTitle());
    }

    @Test
    void getNotifications_unreadOnlyFilters() {
        when(notificationRepo.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(eq(42L), any()))
            .thenReturn(new PageImpl<>(List.of()));

        var result = service.getNotifications(42L, true, 0, 20);
        assertTrue(result.isEmpty());
        verify(notificationRepo).findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(eq(42L), any());
    }

    @Test
    void getUnreadCount_delegates() {
        when(notificationRepo.countByUserIdAndReadAtIsNull(42L)).thenReturn(5L);
        assertEquals(5L, service.getUnreadCount(42L));
    }

    @Test
    void markRead_setsReadAt() {
        Notification n = notification(1L, 42L, "ORDER_STATUS", "T", "B");
        when(notificationRepo.findById(1L)).thenReturn(Optional.of(n));

        service.markRead(1L, 42L);

        assertNotNull(n.getReadAt());
        verify(notificationRepo).save(n);
    }

    @Test
    void markRead_wrongUser_throws() {
        Notification n = notification(1L, 42L, "ORDER_STATUS", "T", "B");
        when(notificationRepo.findById(1L)).thenReturn(Optional.of(n));

        assertThrows(ResourceNotFoundException.class, () -> service.markRead(1L, 999L));
    }

    @Test
    void markRead_alreadyRead_noOp() {
        Notification n = notification(1L, 42L, "ORDER_STATUS", "T", "B");
        n.setReadAt(OffsetDateTime.now());
        when(notificationRepo.findById(1L)).thenReturn(Optional.of(n));

        service.markRead(1L, 42L);

        verify(notificationRepo, never()).save(any());
    }

    @Test
    void markAllRead_delegates() {
        service.markAllRead(42L);
        verify(notificationRepo).markAllReadByUserId(eq(42L), any(OffsetDateTime.class));
    }

    private Notification notification(Long id, Long userId, String type, String title, String body) {
        Notification n = new Notification();
        n.setId(id);
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title);
        n.setBody(body);
        n.setCreatedAt(OffsetDateTime.now());
        return n;
    }
}

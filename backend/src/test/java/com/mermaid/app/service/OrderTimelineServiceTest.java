package com.mermaid.app.service;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderStatusEvent;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.OrderStatusEventRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderTimelineServiceTest {

    @Mock OrderStatusEventRepository eventRepo;
    @Mock OrderRepository orderRepo;
    @Mock UserRepository userRepo;
    @InjectMocks OrderTimelineService service;

    // --- getTimeline ---

    @Test
    void getTimeline_returnsEventsWithActorNames() {
        OrderStatusEvent e1 = event(1L, 10L, "PENDING", 42L);
        OrderStatusEvent e2 = event(2L, 10L, "CONFIRMED", 5L);
        when(eventRepo.findByOrderIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(e1, e2));

        User buyer = user(42L, "Maria");
        User seller = user(5L, "Juan");
        when(userRepo.findAllById(List.of(42L, 5L))).thenReturn(List.of(buyer, seller));

        List<com.mermaid.app.model.OrderStatusEvent> result = service.getTimeline(10L);

        assertEquals(2, result.size());
        assertEquals("PENDING", result.get(0).getStatus());
        assertEquals("Maria", result.get(0).getActorName().get());
        assertEquals("CONFIRMED", result.get(1).getStatus());
        assertEquals("Juan", result.get(1).getActorName().get());
    }

    @Test
    void getTimeline_emptyEvents_orderNotFound_throws() {
        when(eventRepo.findByOrderIdOrderByCreatedAtAsc(99L)).thenReturn(List.of());
        when(orderRepo.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getTimeline(99L));
    }

    @Test
    void getTimeline_emptyEvents_orderExists_returnsEmpty() {
        when(eventRepo.findByOrderIdOrderByCreatedAtAsc(10L)).thenReturn(List.of());
        when(orderRepo.findById(10L)).thenReturn(Optional.of(order(10L, 42L, 5L)));

        List<com.mermaid.app.model.OrderStatusEvent> result = service.getTimeline(10L);
        assertTrue(result.isEmpty());
    }

    @Test
    void getTimeline_nullActorId_handledGracefully() {
        OrderStatusEvent e = event(1L, 10L, "COMPLETED", null);
        when(eventRepo.findByOrderIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(e));
        when(userRepo.findAllById(List.of())).thenReturn(List.of());

        List<com.mermaid.app.model.OrderStatusEvent> result = service.getTimeline(10L);

        assertEquals(1, result.size());
        assertNull(result.get(0).getActorName().get());
    }

    // --- getTimelineForBuyer ---

    @Test
    void getTimelineForBuyer_notBuyer_throws() {
        when(orderRepo.findById(10L)).thenReturn(Optional.of(order(10L, 42L, 5L)));

        assertThrows(ResourceNotFoundException.class,
            () -> service.getTimelineForBuyer(10L, 999L));
    }

    @Test
    void getTimelineForBuyer_isBuyer_succeeds() {
        Order order = order(10L, 42L, 5L);
        OrderStatusEvent e = event(1L, 10L, "PENDING", 42L);
        when(orderRepo.findById(10L)).thenReturn(Optional.of(order));
        when(eventRepo.findByOrderIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(e));
        when(userRepo.findAllById(any())).thenReturn(List.of(user(42L, "Maria")));

        List<com.mermaid.app.model.OrderStatusEvent> result =
            service.getTimelineForBuyer(10L, 42L);

        assertEquals(1, result.size());
    }

    // --- getTimelineForParticipant ---

    @Test
    void getTimelineForParticipant_notParticipant_throws() {
        when(orderRepo.findByIdAndParticipant(10L, 999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> service.getTimelineForParticipant(10L, 999L));
    }

    // --- recordEvent ---

    @Test
    void recordEvent_savesCorrectFields() {
        OrderStatusEvent saved = event(1L, 10L, "CONFIRMED", 5L);
        when(eventRepo.save(any())).thenReturn(saved);

        OrderStatusEvent result = service.recordEvent(10L, "CONFIRMED", 5L, "Seller accepted");

        verify(eventRepo).save(argThat(e ->
            e.getOrderId().equals(10L) &&
            e.getStatus().equals("CONFIRMED") &&
            e.getActorId().equals(5L) &&
            "Seller accepted".equals(e.getNote())
        ));
    }

    // --- isValidTransition ---

    @Test
    void isValidTransition_pendingToConfirmed_true() {
        assertTrue(service.isValidTransition("PENDING", "CONFIRMED"));
    }

    @Test
    void isValidTransition_pendingToCancelled_true() {
        assertTrue(service.isValidTransition("PENDING", "CANCELLED"));
    }

    @Test
    void isValidTransition_pendingToCompleted_false() {
        assertFalse(service.isValidTransition("PENDING", "COMPLETED"));
    }

    @Test
    void isValidTransition_confirmedToCompleted_true() {
        assertTrue(service.isValidTransition("CONFIRMED", "COMPLETED"));
    }

    @Test
    void isValidTransition_completedToCancelled_false() {
        assertFalse(service.isValidTransition("COMPLETED", "CANCELLED"));
    }

    @Test
    void isValidTransition_cancelledToAnything_false() {
        assertFalse(service.isValidTransition("CANCELLED", "PENDING"));
        assertFalse(service.isValidTransition("CANCELLED", "CONFIRMED"));
    }

    @Test
    void isValidTransition_disputedToCompleted_true() {
        assertTrue(service.isValidTransition("DISPUTED", "COMPLETED"));
    }

    // --- helpers ---

    private OrderStatusEvent event(Long id, Long orderId, String status, Long actorId) {
        OrderStatusEvent e = new OrderStatusEvent();
        e.setId(id);
        e.setOrderId(orderId);
        e.setStatus(status);
        e.setActorId(actorId);
        e.setCreatedAt(OffsetDateTime.now());
        return e;
    }

    private Order order(Long id, Long buyerId, Long sellerId) {
        Order o = new Order();
        o.setId(id);
        o.setBuyerId(buyerId);
        o.setSellerId(sellerId);
        o.setStatus("PENDING");
        return o;
    }

    private User user(Long id, String name) {
        User u = new User();
        u.setId(id);
        u.setFullName(name);
        return u;
    }
}

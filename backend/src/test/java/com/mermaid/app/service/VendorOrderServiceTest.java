package com.mermaid.app.service;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.event.OrderStatusChangeEvent;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.OrderStatusEventRepository;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VendorOrderServiceTest {

    @Mock OrderRepository orderRepo;
    @Mock OrderStatusEventRepository eventRepo;
    @Mock InventoryService inventoryService;
    @Mock NotificationService notificationService;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock UserRepository userRepo;
    @Mock PaymentRepository paymentRepo;
    @InjectMocks VendorOrderService service;

    // ---- accept ----

    @Test
    void accept_pendingOrder_transitions() {
        Order order = order(1L, 10L, 20L, "PENDING");
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Order result = service.accept(10L, 1L);

        assertThat(result.getStatus()).isEqualTo("CONFIRMED");
    }

    // ---- markReady ----

    @Test
    void markReady_preparingOrder_transitions() {
        Order order = order(1L, 10L, 20L, "PREPARING");
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Order result = service.markReady(10L, 1L);

        assertThat(result.getStatus()).isEqualTo("READY");
    }

    // ---- complete ----

    @Test
    void complete_readyRetailOrder_deductsInventory() {
        Order order = order(1L, 10L, 20L, "READY");
        order.setKind(OrderKind.RETAIL);
        order.setStorefrontListingId(99L);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.complete(10L, 1L);

        verify(inventoryService).deductForOrder(1L);
    }

    @Test
    void complete_readyProcurementOrder_doesNotDeductInventory() {
        Order order = order(1L, 10L, 20L, "READY");
        order.setKind(OrderKind.PROCUREMENT);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.complete(10L, 1L);

        verify(inventoryService, never()).deductForOrder(any());
    }

    // ---- cancel ----

    @Test
    void cancel_pendingOrder_transitions() {
        Order order = order(1L, 10L, 20L, "PENDING");
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Order result = service.cancel(10L, 1L, "out of stock");

        assertThat(result.getStatus()).isEqualTo("CANCELLED");
    }

    @Test
    void cancel_confirmedOrder_transitions() {
        Order order = order(1L, 10L, 20L, "CONFIRMED");
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Order result = service.cancel(10L, 1L, null);

        assertThat(result.getStatus()).isEqualTo("CANCELLED");
    }

    // ---- illegal transitions ----

    @Test
    void accept_completedOrder_throwsIllegalArgument() {
        Order order = order(1L, 10L, 20L, "COMPLETED");
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.accept(10L, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot transition");
    }

    @Test
    void markReady_pendingOrder_throwsIllegalArgument() {
        Order order = order(1L, 10L, 20L, "PENDING");
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.markReady(10L, 1L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void cancel_readyOrder_throwsIllegalArgument() {
        Order order = order(1L, 10L, 20L, "READY");
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancel(10L, 1L, "reason"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void cancel_completedOrder_throwsIllegalArgument() {
        Order order = order(1L, 10L, 20L, "COMPLETED");
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancel(10L, 1L, "reason"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ---- vendor scoping ----

    @Test
    void accept_otherVendorOrder_throwsAccessDenied() {
        Order order = order(1L, 99L, 20L, "PENDING"); // seller is 99, not 10
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.accept(10L, 1L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void accept_orderNotFound_throwsResourceNotFound() {
        when(orderRepo.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.accept(10L, 999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- status event publishing ----

    @Test
    void accept_publishesStatusChangeEvent() {
        Order order = order(1L, 10L, 20L, "PENDING");
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.accept(10L, 1L);

        verify(eventPublisher).publishEvent(any(OrderStatusChangeEvent.class));
    }

    // ---- helpers ----

    private static Order order(Long id, Long sellerId, Long buyerId, String status) {
        Order o = new Order();
        o.setId(id);
        o.setSellerId(sellerId);
        o.setBuyerId(buyerId);
        o.setStatus(status);
        o.setKind(OrderKind.RETAIL);
        return o;
    }
}

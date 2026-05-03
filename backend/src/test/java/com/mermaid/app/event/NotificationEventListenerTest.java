package com.mermaid.app.event;

import com.mermaid.app.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationEventListenerTest {

    @Mock NotificationService notificationService;
    @InjectMocks NotificationEventListener listener;

    @Test
    void onOrderStatusChange_notifiesBuyerAndSeller() {
        OrderStatusChangeEvent event = new OrderStatusChangeEvent(
            this, 10L, 42L, 5L, "CONFIRMED", "Order confirmed by seller"
        );

        listener.onOrderStatusChange(event);

        // Should notify buyer
        verify(notificationService).notify(
            eq(42L), eq("ORDER_STATUS"), eq("Order Confirmed"),
            contains("CONFIRMED"), eq("/buyer/orders/10")
        );

        // Should notify seller
        verify(notificationService).notify(
            eq(5L), eq("ORDER_STATUS"), eq("Order Confirmed"),
            contains("CONFIRMED"), eq("/orders/10")
        );
    }

    @Test
    void onOrderStatusChange_cancelled_correctTitle() {
        OrderStatusChangeEvent event = new OrderStatusChangeEvent(
            this, 10L, 42L, 5L, "CANCELLED", null
        );

        listener.onOrderStatusChange(event);

        verify(notificationService).notify(
            eq(42L), eq("ORDER_STATUS"), eq("Order Cancelled"),
            contains("CANCELLED"), anyString()
        );
    }

    @Test
    void onOrderStatusChange_exceptionSwallowed() {
        OrderStatusChangeEvent event = new OrderStatusChangeEvent(
            this, 10L, 42L, 5L, "COMPLETED", "Done"
        );
        doThrow(new RuntimeException("DB error")).when(notificationService).notify(anyLong(), any(), any(), any(), any());

        // Should not throw
        listener.onOrderStatusChange(event);
    }
}

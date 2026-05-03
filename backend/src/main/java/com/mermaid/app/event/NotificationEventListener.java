package com.mermaid.app.event;

import com.mermaid.app.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listens for domain events and creates in-app notifications.
 */
@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

    private final NotificationService notificationService;

    public NotificationEventListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @EventListener
    @Async
    public void onOrderStatusChange(OrderStatusChangeEvent event) {
        try {
            String title = formatTitle(event.getNewStatus());
            String body = formatBody(event.getOrderId(), event.getNewStatus(), event.getNote());
            String link = "/buyer/orders/" + event.getOrderId();

            // Notify buyer
            notificationService.notify(
                event.getBuyerId(),
                "ORDER_STATUS",
                title,
                body,
                link
            );

            // Notify seller
            notificationService.notify(
                event.getSellerId(),
                "ORDER_STATUS",
                title,
                body,
                "/orders/" + event.getOrderId()
            );

            log.debug("Notifications sent for order {} status → {}", event.getOrderId(), event.getNewStatus());
        } catch (Exception e) {
            log.warn("Failed to create notification for order {}: {}", event.getOrderId(), e.getMessage());
        }
    }

    private String formatTitle(String status) {
        return switch (status) {
            case "PENDING" -> "New Order Placed";
            case "CONFIRMED" -> "Order Confirmed";
            case "PROCESSING" -> "Order Being Prepared";
            case "READY_FOR_PICKUP" -> "Order Ready for Pickup";
            case "OUT_FOR_DELIVERY" -> "Order Out for Delivery";
            case "COMPLETED" -> "Order Completed";
            case "CANCELLED" -> "Order Cancelled";
            case "DISPUTED" -> "Order Disputed";
            default -> "Order Updated";
        };
    }

    private String formatBody(Long orderId, String status, String note) {
        String base = "Order #" + orderId + " has been updated to " + status + ".";
        if (note != null && !note.isBlank()) {
            base += " " + note;
        }
        return base;
    }
}

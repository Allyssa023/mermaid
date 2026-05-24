package com.mermaid.app.event;

import com.mermaid.app.service.LiveEventPublisher;
import com.mermaid.app.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Listens for domain events and creates in-app notifications.
 */
@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

    private final NotificationService notificationService;
    private final LiveEventPublisher liveEventPublisher;

    public NotificationEventListener(NotificationService notificationService,
                                      LiveEventPublisher liveEventPublisher) {
        this.notificationService = notificationService;
        this.liveEventPublisher = liveEventPublisher;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void onOrderStatusChange(OrderStatusChangeEvent event) {
        log.info("onOrderStatusChange fired for order={} status={} buyerId={} sellerId={}",
            event.getOrderId(), event.getNewStatus(), event.getBuyerId(), event.getSellerId());

        // 1) Push live events FIRST so a downstream notify() failure can't block them.
        //    Each send is isolated so one failure doesn't cancel the others.
        Map<String, Object> payload = Map.of(
            "orderId", event.getOrderId(),
            "status",  event.getNewStatus()
        );
        try {
            liveEventPublisher.pushToUser(event.getBuyerId(), "ORDER_CHANGED", payload);
        } catch (Exception e) {
            log.warn("pushToUser(buyer={}) failed for order {}: {}", event.getBuyerId(), event.getOrderId(), e.getMessage());
        }
        try {
            liveEventPublisher.pushToUser(event.getSellerId(), "ORDER_CHANGED", payload);
        } catch (Exception e) {
            log.warn("pushToUser(seller={}) failed for order {}: {}", event.getSellerId(), event.getOrderId(), e.getMessage());
        }

        // 2) Persist + push bell notifications. Isolated so a failure on one
        //    side does not affect the other.
        String title = formatTitle(event.getNewStatus());
        String body = formatBody(event.getOrderId(), event.getNewStatus(), event.getNote());
        try {
            notificationService.notify(event.getBuyerId(), "ORDER_STATUS", title, body,
                "/buyer/orders/" + event.getOrderId());
        } catch (Exception e) {
            log.warn("notify(buyer={}) failed for order {}: {}", event.getBuyerId(), event.getOrderId(), e.getMessage(), e);
        }
        try {
            notificationService.notify(event.getSellerId(), "ORDER_STATUS", title, body,
                "/orders/" + event.getOrderId());
        } catch (Exception e) {
            log.warn("notify(seller={}) failed for order {}: {}", event.getSellerId(), event.getOrderId(), e.getMessage(), e);
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

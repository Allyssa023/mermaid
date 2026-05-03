package com.mermaid.app.event;

import org.springframework.context.ApplicationEvent;

/**
 * Published when an order's status changes.
 * Consumed by NotificationEventListener to send in-app notifications.
 */
public class OrderStatusChangeEvent extends ApplicationEvent {

    private final Long orderId;
    private final Long buyerId;
    private final Long sellerId;
    private final String newStatus;
    private final String note;

    public OrderStatusChangeEvent(Object source, Long orderId, Long buyerId, Long sellerId,
                                   String newStatus, String note) {
        super(source);
        this.orderId = orderId;
        this.buyerId = buyerId;
        this.sellerId = sellerId;
        this.newStatus = newStatus;
        this.note = note;
    }

    public Long getOrderId() { return orderId; }
    public Long getBuyerId() { return buyerId; }
    public Long getSellerId() { return sellerId; }
    public String getNewStatus() { return newStatus; }
    public String getNote() { return note; }
}

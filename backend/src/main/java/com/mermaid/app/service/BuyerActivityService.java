package com.mermaid.app.service;

import com.mermaid.app.domain.Message;
import com.mermaid.app.domain.Notification;
import com.mermaid.app.domain.OrderStatusEvent;
import com.mermaid.app.domain.User;
import com.mermaid.app.model.ActivityFeedItem;
import com.mermaid.app.repository.MessageRepository;
import com.mermaid.app.repository.NotificationRepository;
import com.mermaid.app.repository.OrderStatusEventRepository;
import com.mermaid.app.repository.UserRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BuyerActivityService {

    private final NotificationRepository notificationRepo;
    private final OrderStatusEventRepository eventRepo;
    private final MessageRepository messageRepo;
    private final UserRepository userRepo;

    public BuyerActivityService(NotificationRepository notificationRepo,
                                OrderStatusEventRepository eventRepo,
                                MessageRepository messageRepo,
                                UserRepository userRepo) {
        this.notificationRepo = notificationRepo;
        this.eventRepo = eventRepo;
        this.messageRepo = messageRepo;
        this.userRepo = userRepo;
    }

    @Transactional(readOnly = true)
    public List<ActivityFeedItem> getActivity(Long buyerId, int limit) {
        int cap = Math.max(1, Math.min(limit, 100));
        PageRequest page = PageRequest.of(0, cap);

        List<ActivityFeedItem> items = new ArrayList<>();

        // 1) Notifications
        notificationRepo.findByUserIdOrderByCreatedAtDesc(buyerId, page)
                .getContent()
                .forEach(n -> items.add(fromNotification(n)));

        // 2) Order status events for this buyer's orders
        List<OrderStatusEvent> events = eventRepo.findRecentForBuyer(buyerId, page);
        for (OrderStatusEvent e : events) {
            items.add(fromOrderEvent(e));
        }

        // 3) Recent received messages — group by sender to one item per conversation
        List<Message> recentMsgs = messageRepo.findRecentReceived(buyerId, page);
        Map<Long, Message> latestPerSender = new HashMap<>();
        for (Message m : recentMsgs) {
            if (m.getSender() == null) continue;
            latestPerSender.putIfAbsent(m.getSender().getId(), m);
        }
        Map<Long, User> senders = userRepo.findAllById(latestPerSender.keySet())
                .stream().collect(Collectors.toMap(User::getId, u -> u));
        for (Message m : latestPerSender.values()) {
            items.add(fromMessage(m, senders.get(m.getSender().getId())));
        }

        items.sort(Comparator.comparing(ActivityFeedItem::getOccurredAt).reversed());
        if (items.size() > cap) return items.subList(0, cap);
        return items;
    }

    private ActivityFeedItem fromNotification(Notification n) {
        ActivityFeedItem item = new ActivityFeedItem(
                "NOTIFICATION:" + n.getId(),
                ActivityFeedItem.KindEnum.NOTIFICATION,
                n.getTitle() != null ? n.getTitle() : "Notification",
                n.getBody() != null ? n.getBody() : "",
                n.getCreatedAt()
        );
        item.setLink(JsonNullable.of(n.getLink()));
        item.setUnread(n.getReadAt() == null);
        Map<String, Object> meta = new HashMap<>();
        meta.put("notificationType", n.getType());
        item.setMeta(meta);
        return item;
    }

    private ActivityFeedItem fromOrderEvent(OrderStatusEvent e) {
        String status = e.getStatus() != null ? e.getStatus() : "UPDATED";
        ActivityFeedItem item = new ActivityFeedItem(
                "ORDER_STATUS:" + e.getId(),
                ActivityFeedItem.KindEnum.ORDER_STATUS,
                "Order #" + e.getOrderId() + " — " + status,
                e.getNote() != null && !e.getNote().isBlank() ? e.getNote()
                        : "Status changed to " + status,
                e.getCreatedAt()
        );
        item.setLink(JsonNullable.of("/buyer/orders/" + e.getOrderId()));
        item.setUnread(false);
        Map<String, Object> meta = new HashMap<>();
        meta.put("orderId", e.getOrderId());
        meta.put("status", status);
        item.setMeta(meta);
        return item;
    }

    private ActivityFeedItem fromMessage(Message m, User sender) {
        String fromName = sender != null && sender.getFullName() != null
                ? sender.getFullName() : "Someone";
        String body = m.getContent() != null
                ? (m.getContent().length() > 140 ? m.getContent().substring(0, 137) + "…" : m.getContent())
                : "";
        ActivityFeedItem item = new ActivityFeedItem(
                "MESSAGE:" + m.getId(),
                ActivityFeedItem.KindEnum.MESSAGE,
                "Message from " + fromName,
                body,
                m.getSentAt()
        );
        Long fromId = m.getSender() != null ? m.getSender().getId() : null;
        if (fromId != null) {
            item.setLink(JsonNullable.of("/buyer/messages/" + fromId));
        } else {
            item.setLink(JsonNullable.of(null));
        }
        item.setUnread(!m.isRead());
        Map<String, Object> meta = new HashMap<>();
        if (fromId != null) meta.put("fromUserId", fromId);
        item.setMeta(meta);
        return item;
    }
}

package com.mermaid.app.service;

import com.mermaid.app.domain.OrderStatusEvent;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.OrderStatusEventRepository;
import com.mermaid.app.repository.UserRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for managing and querying order status timeline events.
 * <p>
 * Every status transition on an order writes an append-only row to the
 * {@code order_status_events} table, giving buyers a chronological timeline
 * of their order's journey (e.g. PENDING → CONFIRMED → COMPLETED).
 */
@Service
public class OrderTimelineService {

    // Valid status transitions — key is current status, value is set of allowed next statuses
    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.of(
        "PENDING",   Set.of("CONFIRMED", "CANCELLED"),
        "CONFIRMED", Set.of("PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED", "DISPUTED"),
        "PROCESSING", Set.of("READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED", "DISPUTED"),
        "READY_FOR_PICKUP", Set.of("COMPLETED", "CANCELLED", "DISPUTED"),
        "OUT_FOR_DELIVERY", Set.of("COMPLETED", "CANCELLED", "DISPUTED"),
        "COMPLETED", Set.of("DISPUTED"),
        "CANCELLED", Set.of(),
        "DISPUTED",  Set.of("COMPLETED", "CANCELLED")
    );

    private final OrderStatusEventRepository eventRepo;
    private final OrderRepository orderRepo;
    private final UserRepository userRepo;

    public OrderTimelineService(OrderStatusEventRepository eventRepo,
                                 OrderRepository orderRepo,
                                 UserRepository userRepo) {
        this.eventRepo = eventRepo;
        this.orderRepo = orderRepo;
        this.userRepo  = userRepo;
    }

    /**
     * Retrieve the timeline for an order, with actor names resolved.
     */
    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.OrderStatusEvent> getTimeline(Long orderId) {
        List<OrderStatusEvent> events = eventRepo.findByOrderIdOrderByCreatedAtAsc(orderId);
        if (events.isEmpty()) {
            // Verify the order exists
            orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        }

        // Batch-resolve actor names
        List<Long> actorIds = events.stream()
            .map(OrderStatusEvent::getActorId)
            .filter(id -> id != null)
            .distinct().toList();
        Map<Long, String> nameMap = userRepo.findAllById(actorIds).stream()
            .collect(Collectors.toMap(User::getId, User::getFullName));

        return events.stream().map(e -> toModel(e, nameMap)).toList();
    }

    /**
     * Retrieve the timeline for an order, verifying the caller is a participant.
     */
    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.OrderStatusEvent> getTimelineForParticipant(Long orderId, Long userId) {
        orderRepo.findByIdAndParticipant(orderId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        return getTimeline(orderId);
    }

    /**
     * Retrieve the timeline for an order, verifying the caller is the buyer.
     */
    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.OrderStatusEvent> getTimelineForBuyer(Long orderId, Long buyerId) {
        com.mermaid.app.domain.Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!order.getBuyerId().equals(buyerId)) {
            throw new ResourceNotFoundException("Order not found: " + orderId);
        }
        return getTimeline(orderId);
    }

    /**
     * Record a status transition event. Called internally by service methods
     * that change order status.
     */
    @Transactional
    public OrderStatusEvent recordEvent(Long orderId, String newStatus, Long actorId, String note) {
        OrderStatusEvent event = new OrderStatusEvent();
        event.setOrderId(orderId);
        event.setStatus(newStatus);
        event.setActorId(actorId);
        event.setNote(note);
        return eventRepo.save(event);
    }

    /**
     * Validate that a status transition is allowed.
     *
     * @return true if the transition from currentStatus to newStatus is valid
     */
    public boolean isValidTransition(String currentStatus, String newStatus) {
        Set<String> allowed = ALLOWED_TRANSITIONS.get(currentStatus);
        return allowed != null && allowed.contains(newStatus);
    }

    private com.mermaid.app.model.OrderStatusEvent toModel(OrderStatusEvent entity,
                                                            Map<Long, String> nameMap) {
        com.mermaid.app.model.OrderStatusEvent m = new com.mermaid.app.model.OrderStatusEvent(
            entity.getId(),
            entity.getOrderId(),
            entity.getStatus(),
            entity.getCreatedAt()
        );
        m.setActorId(JsonNullable.of(entity.getActorId()));
        m.setActorName(JsonNullable.of(
            entity.getActorId() != null ? nameMap.get(entity.getActorId()) : null
        ));
        m.setNote(JsonNullable.of(entity.getNote()));
        return m;
    }
}

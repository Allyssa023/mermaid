package com.mermaid.app.service;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderDispute;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.OrderDisputeRequest;
import com.mermaid.app.repository.OrderDisputeRepository;
import com.mermaid.app.repository.OrderRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Service
public class DisputeService {

    private final OrderDisputeRepository disputeRepo;
    private final OrderRepository orderRepo;
    private final InventoryService inventoryService;

    public DisputeService(OrderDisputeRepository disputeRepo,
                          OrderRepository orderRepo,
                          InventoryService inventoryService) {
        this.disputeRepo = disputeRepo;
        this.orderRepo = orderRepo;
        this.inventoryService = inventoryService;
    }

    @Transactional
    public OrderDispute raise(Long userId, String role, Long orderId, OrderDisputeRequest req) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!"READY".equals(order.getStatus()) && !"COMPLETED".equals(order.getStatus()))
            throw new IllegalArgumentException(
                    "Can only dispute a READY or COMPLETED order; current: " + order.getStatus());

        if (disputeRepo.existsByOrderIdAndStatus(orderId, "OPEN"))
            throw new IllegalStateException("An open dispute already exists for order: " + orderId);

        OrderDispute dispute = new OrderDispute();
        dispute.setOrderId(orderId);
        dispute.setRaisedBy(role);
        dispute.setPreDisputeStatus(order.getStatus());

        JsonNullable<Double> wt = req.getClaimedWeightKg();
        if (wt != null && wt.isPresent() && wt.get() != null)
            dispute.setClaimedWeightKg(BigDecimal.valueOf(wt.get()));

        JsonNullable<OrderDisputeRequest.ClaimedQualityEnum> q = req.getClaimedQuality();
        if (q != null && q.isPresent() && q.get() != null)
            dispute.setClaimedQuality(q.get().getValue());

        JsonNullable<String> notes = req.getNotes();
        if (notes != null && notes.isPresent())
            dispute.setNotes(notes.get());

        disputeRepo.save(dispute);

        order.setStatus("DISPUTED");
        orderRepo.save(order);

        return dispute;
    }

    @Transactional
    public OrderDispute resolve(Long userId, String role, Long orderId, String resolution) {
        OrderDispute dispute = disputeRepo.findByOrderIdAndStatus(orderId, "OPEN")
                .orElseThrow(() -> new ResourceNotFoundException("No open dispute for order: " + orderId));

        if (role.equals(dispute.getRaisedBy()))
            throw new AccessDeniedException("Cannot resolve a dispute you raised");

        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        order.setStatus("COMPLETED");
        orderRepo.save(order);

        if ("READY".equals(dispute.getPreDisputeStatus()))
            inventoryService.addLotFromProcurement(orderId);

        dispute.setStatus("RESOLVED");
        dispute.setResolvedAt(OffsetDateTime.now());
        dispute.setResolution(resolution);
        return disputeRepo.save(dispute);
    }

    @Transactional(readOnly = true)
    public OrderDispute getOpenDispute(Long orderId) {
        return disputeRepo.findByOrderIdAndStatus(orderId, "OPEN")
                .orElseThrow(() -> new ResourceNotFoundException("No open dispute for order: " + orderId));
    }
}

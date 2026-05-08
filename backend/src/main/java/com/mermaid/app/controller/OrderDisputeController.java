package com.mermaid.app.controller;

import com.mermaid.app.api.OrderDisputesApi;
import com.mermaid.app.domain.OrderDispute;
import com.mermaid.app.model.DisputeResolveRequest;
import com.mermaid.app.model.OrderDisputeDto;
import com.mermaid.app.model.OrderDisputeRequest;
import com.mermaid.app.service.DisputeService;
import com.mermaid.app.security.SecurityUtils;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OrderDisputeController implements OrderDisputesApi {

    private final DisputeService disputeService;

    public OrderDisputeController(DisputeService disputeService) {
        this.disputeService = disputeService;
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN')")
    public ResponseEntity<OrderDisputeDto> fishermanRaiseDispute(Long id, OrderDisputeRequest req) {
        OrderDispute d = disputeService.raise(SecurityUtils.currentUserId(), "FISHERMAN", id, req);
        return ResponseEntity.status(201).body(toDto(d));
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN')")
    public ResponseEntity<OrderDisputeDto> fishermanGetDispute(Long id) {
        return ResponseEntity.ok(toDto(disputeService.getOpenDispute(id)));
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN')")
    public ResponseEntity<OrderDisputeDto> fishermanResolveDispute(Long id, DisputeResolveRequest req) {
        OrderDispute d = disputeService.resolve(SecurityUtils.currentUserId(), "FISHERMAN", id, req.getResolution());
        return ResponseEntity.ok(toDto(d));
    }

    @Override
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<OrderDisputeDto> vendorRaiseDispute(Long id, OrderDisputeRequest req) {
        OrderDispute d = disputeService.raise(SecurityUtils.currentUserId(), "VENDOR", id, req);
        return ResponseEntity.status(201).body(toDto(d));
    }

    @Override
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<OrderDisputeDto> vendorGetDispute(Long id) {
        return ResponseEntity.ok(toDto(disputeService.getOpenDispute(id)));
    }

    @Override
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<OrderDisputeDto> vendorResolveDispute(Long id, DisputeResolveRequest req) {
        OrderDispute d = disputeService.resolve(SecurityUtils.currentUserId(), "VENDOR", id, req.getResolution());
        return ResponseEntity.ok(toDto(d));
    }

    private OrderDisputeDto toDto(OrderDispute d) {
        OrderDisputeDto dto = new OrderDisputeDto();
        dto.setId(d.getId());
        dto.setOrderId(d.getOrderId());
        dto.setRaisedBy(d.getRaisedBy());
        dto.setPreDisputeStatus(d.getPreDisputeStatus());
        dto.setStatus(d.getStatus());
        if (d.getClaimedWeightKg() != null)
            dto.setClaimedWeightKg(JsonNullable.of(d.getClaimedWeightKg().doubleValue()));
        if (d.getClaimedQuality() != null)
            dto.setClaimedQuality(JsonNullable.of(d.getClaimedQuality()));
        if (d.getNotes() != null)
            dto.setNotes(JsonNullable.of(d.getNotes()));
        if (d.getResolvedAt() != null)
            dto.setResolvedAt(JsonNullable.of(d.getResolvedAt()));
        if (d.getResolution() != null)
            dto.setResolution(JsonNullable.of(d.getResolution()));
        dto.setCreatedAt(d.getCreatedAt());
        return dto;
    }
}

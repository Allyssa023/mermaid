package com.mermaid.app.controller;

import com.mermaid.app.api.FishermanProcurementApi;
import com.mermaid.app.domain.User;
import com.mermaid.app.model.ProcurementOrderSummary;
import com.mermaid.app.model.VendorCancelOrderRequest;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.ProcurementOrderService;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class FishermanProcurementController implements FishermanProcurementApi {

    private final ProcurementOrderService orderService;
    private final UserRepository userRepo;

    public FishermanProcurementController(ProcurementOrderService orderService,
                                          UserRepository userRepo) {
        this.orderService = orderService;
        this.userRepo = userRepo;
    }

    @Override
    public ResponseEntity<List<ProcurementOrderSummary>> listFishermanProcurementOrders(String bucket) {
        Long fid = SecurityUtils.currentUserId();
        return ResponseEntity.ok(orderService.listForFisherman(fid, bucket).stream()
                .map(this::toSummary).collect(Collectors.toList()));
    }

    @Override
    public ResponseEntity<ProcurementOrderSummary> fishermanAcceptProcurement(Long orderId) {
        Long fid = SecurityUtils.currentUserId();
        return ResponseEntity.ok(toSummary(orderService.fishermanAccept(fid, orderId)));
    }

    @Override
    public ResponseEntity<ProcurementOrderSummary> fishermanMarkProcurementReady(Long orderId) {
        Long fid = SecurityUtils.currentUserId();
        return ResponseEntity.ok(toSummary(orderService.fishermanMarkReady(fid, orderId)));
    }

    @Override
    public ResponseEntity<ProcurementOrderSummary> fishermanCompleteProcurement(Long orderId) {
        Long fid = SecurityUtils.currentUserId();
        return ResponseEntity.ok(toSummary(orderService.fishermanComplete(fid, orderId)));
    }

    @Override
    public ResponseEntity<ProcurementOrderSummary> fishermanCancelProcurement(Long orderId,
                                                                               VendorCancelOrderRequest req) {
        Long fid = SecurityUtils.currentUserId();
        String reason = req != null ? req.getReason() : null;
        return ResponseEntity.ok(toSummary(orderService.fishermanCancel(fid, orderId, reason)));
    }

    private ProcurementOrderSummary toSummary(com.mermaid.app.domain.Order order) {
        ProcurementOrderSummary dto = new ProcurementOrderSummary();
        dto.setId(order.getId());
        dto.setFishermanId(order.getSellerId());
        dto.setFishermanName(JsonNullable.of(
                userRepo.findById(order.getSellerId()).map(User::getFullName).orElse(null)));
        if (order.getSpecies() != null) {
            dto.setSpeciesId(order.getSpecies().getId());
            dto.setSpeciesName(order.getSpecies().getCommonName());
        }
        dto.setQtyKg(JsonNullable.of(
                order.getOrderedQtyKg() != null ? order.getOrderedQtyKg().doubleValue() : null));
        if (order.getAgreedPricePerKg() != null) dto.setPricePerKg(order.getAgreedPricePerKg().doubleValue());
        dto.setStatus(order.getStatus());
        dto.setCatchAlertId(JsonNullable.of(order.getCatchAlertId()));
        dto.setIsPreorder(order.getCatchAlertId() == null);
        dto.setNotes(JsonNullable.of(order.getNotes()));
        dto.setCreatedAt(order.getCreatedAt());
        return dto;
    }
}

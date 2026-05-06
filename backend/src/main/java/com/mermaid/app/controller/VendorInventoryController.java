package com.mermaid.app.controller;

import com.mermaid.app.api.VendorInventoryApi;
import com.mermaid.app.domain.MovementReason;
import com.mermaid.app.mapper.InventoryLotMapper;
import com.mermaid.app.model.InventoryAdjustmentRequest;
import com.mermaid.app.model.InventoryLotResponse;
import com.mermaid.app.model.VendorGetInventoryAvailability200Response;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.InventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@PreAuthorize("hasRole('VENDOR')")
public class VendorInventoryController implements VendorInventoryApi {

    private final InventoryService inventoryService;
    private final InventoryLotMapper lotMapper;

    public VendorInventoryController(InventoryService inventoryService,
                                     InventoryLotMapper lotMapper) {
        this.inventoryService = inventoryService;
        this.lotMapper = lotMapper;
    }

    @Override
    public ResponseEntity<List<InventoryLotResponse>> vendorListInventoryLots(Long speciesId,
                                                                               Boolean includeEmpty) {
        Long vendorId = SecurityUtils.currentUserId();
        boolean empty = includeEmpty != null && includeEmpty;
        return ResponseEntity.ok(
                inventoryService.lotsForVendor(vendorId, speciesId, empty)
                        .stream().map(lotMapper::toDto).collect(Collectors.toList())
        );
    }

    @Override
    public ResponseEntity<InventoryLotResponse> vendorRecordAdjustment(
            InventoryAdjustmentRequest request) {
        MovementReason reason = MovementReason.valueOf(request.getReason().getValue());
        BigDecimal delta = BigDecimal.valueOf(request.getDeltaKg());
        String note = request.getNote() != null && request.getNote().isPresent()
                ? request.getNote().get() : null;
        return ResponseEntity.ok(
                lotMapper.toDto(inventoryService.recordAdjustment(
                        request.getLotId(), delta, reason, note))
        );
    }

    @Override
    public ResponseEntity<VendorGetInventoryAvailability200Response> vendorGetInventoryAvailability(
            Long speciesId) {
        Long vendorId = SecurityUtils.currentUserId();
        BigDecimal available = inventoryService.availableKg(vendorId, speciesId);
        VendorGetInventoryAvailability200Response response =
                new VendorGetInventoryAvailability200Response();
        response.setAvailableKg(available.doubleValue());
        return ResponseEntity.ok(response);
    }
}

package com.mermaid.app.controller;

import com.mermaid.app.api.VendorOrdersApi;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.model.VendorCancelOrderRequest;
import com.mermaid.app.model.VendorOrderSummary;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.VendorOrderService;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@PreAuthorize("hasRole('VENDOR')")
public class VendorOrdersController implements VendorOrdersApi {

    private final VendorOrderService service;
    private final UserRepository userRepo;
    private final FishSpeciesRepository speciesRepo;

    public VendorOrdersController(VendorOrderService service,
                                  UserRepository userRepo,
                                  FishSpeciesRepository speciesRepo) {
        this.service = service;
        this.userRepo = userRepo;
        this.speciesRepo = speciesRepo;
    }

    @Override
    public ResponseEntity<List<VendorOrderSummary>> vendorListOrders(String bucket, String kind) {
        Long vendorId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(
                service.listInbox(vendorId, bucket, kind)
                        .stream().map(this::toSummary).collect(Collectors.toList()));
    }

    @Override
    public ResponseEntity<VendorOrderSummary> vendorAcceptOrder(Long orderId) {
        return ResponseEntity.ok(toSummary(service.accept(SecurityUtils.currentUserId(), orderId)));
    }

    @Override
    public ResponseEntity<VendorOrderSummary> vendorMarkOrderReady(Long orderId) {
        return ResponseEntity.ok(toSummary(service.markReady(SecurityUtils.currentUserId(), orderId)));
    }

    @Override
    public ResponseEntity<VendorOrderSummary> vendorCompleteOrder(Long orderId) {
        return ResponseEntity.ok(toSummary(service.complete(SecurityUtils.currentUserId(), orderId)));
    }

    @Override
    public ResponseEntity<VendorOrderSummary> vendorCancelOrder(Long orderId,
                                                                 VendorCancelOrderRequest request) {
        String reason = request != null && request.getReason() != null ? request.getReason() : null;
        return ResponseEntity.ok(toSummary(service.cancel(SecurityUtils.currentUserId(), orderId, reason)));
    }

    private VendorOrderSummary toSummary(Order order) {
        VendorOrderSummary dto = new VendorOrderSummary(
                order.getId(),
                order.getBuyerId(),
                order.getSpecies() != null ? order.getSpecies().getId() : null,
                VendorOrderSummary.StatusEnum.fromValue(order.getStatus()),
                order.getKind() != null
                        ? VendorOrderSummary.KindEnum.fromValue(order.getKind().name())
                        : VendorOrderSummary.KindEnum.RETAIL,
                order.getCreatedAt()
        );
        String buyerName = userRepo.findById(order.getBuyerId())
                .map(u -> u.getFullName()).orElse(null);
        dto.setBuyerName(JsonNullable.of(buyerName));

        if (order.getSpecies() != null) {
            dto.setSpeciesName(JsonNullable.of(order.getSpecies().getCommonName()));
        }
        if (order.getOrderedQtyKg() != null) {
            dto.setQtyKg(JsonNullable.of(order.getOrderedQtyKg().doubleValue()));
        }
        if (order.getAgreedPricePerKg() != null) {
            dto.setPricePerKg(order.getAgreedPricePerKg().doubleValue());
        }
        if (order.getStorefrontListingId() != null) {
            dto.setStorefrontListingId(JsonNullable.of(order.getStorefrontListingId()));
        }
        return dto;
    }
}

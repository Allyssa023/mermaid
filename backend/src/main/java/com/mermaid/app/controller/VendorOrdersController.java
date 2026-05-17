package com.mermaid.app.controller;

import com.mermaid.app.api.VendorOrdersApi;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.model.VendorCancelOrderRequest;
import com.mermaid.app.model.VendorCompleteOrderRequest;
import com.mermaid.app.model.VendorDeliveredRequest;
import com.mermaid.app.model.VendorOrderSummary;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.VendorOrderService;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
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
    public ResponseEntity<List<VendorOrderSummary>> vendorListOrders(String bucket,
                                                                     String status,
                                                                     String kind,
                                                                     Long buyerId) {
        Long vendorId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(
                service.listInbox(vendorId, bucket, status, kind, buyerId)
                        .stream().map(this::toSummary).collect(Collectors.toList()));
    }

    @Override
    public ResponseEntity<String> vendorExportOrders(String status, LocalDate from, LocalDate to) {
        Long vendorId = SecurityUtils.currentUserId();
        String csv = service.exportCsv(vendorId, status, from, to);
        String filename = "vendor-orders-" + LocalDate.now() + ".csv";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        return ResponseEntity.ok().headers(headers).body(csv);
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
    public ResponseEntity<VendorOrderSummary> vendorMarkPreparing(Long orderId) {
        return ResponseEntity.ok(toSummary(service.markPreparing(SecurityUtils.currentUserId(), orderId)));
    }

    @Override
    public ResponseEntity<VendorOrderSummary> vendorDispatchOrder(Long orderId) {
        return ResponseEntity.ok(toSummary(service.dispatch(SecurityUtils.currentUserId(), orderId)));
    }

    @Override
    public ResponseEntity<VendorOrderSummary> vendorMarkDelivered(Long orderId, VendorDeliveredRequest request) {
        Double codAmount = (request != null && request.getCodAmount() != null) ? request.getCodAmount() : null;
        return ResponseEntity.ok(toSummary(service.markDelivered(SecurityUtils.currentUserId(), orderId, codAmount)));
    }

    @Override
    public ResponseEntity<VendorOrderSummary> vendorCompleteOrder(Long orderId, VendorCompleteOrderRequest request) {
        Double codAmount = (request != null && request.getCodAmount() != null) ? request.getCodAmount() : null;
        return ResponseEntity.ok(toSummary(service.completePickup(SecurityUtils.currentUserId(), orderId, codAmount)));
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
        if (order.getDeliveryFee() != null) {
            dto.setDeliveryFee(JsonNullable.of(order.getDeliveryFee().doubleValue()));
        }
        if (order.getDispatchMode() != null) {
            dto.setDispatchMode(JsonNullable.of(order.getDispatchMode()));
        }
        return dto;
    }
}

package com.mermaid.app.controller;

import com.mermaid.app.api.VendorProcurementApi;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.domain.ProcurementCartItem;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.CatchAlertRepository;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.ProcurementCartService;
import com.mermaid.app.service.ProcurementOrderService;
import com.mermaid.app.service.WatchlistService;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@PreAuthorize("hasRole('VENDOR')")
public class VendorProcurementController implements VendorProcurementApi {

    private final ProcurementCartService cartService;
    private final ProcurementOrderService orderService;
    private final CatchAlertRepository alertRepo;
    private final OrderRepository orderRepo;
    private final UserRepository userRepo;
    private final WatchlistService watchlistService;

    public VendorProcurementController(ProcurementCartService cartService,
                                       ProcurementOrderService orderService,
                                       CatchAlertRepository alertRepo,
                                       OrderRepository orderRepo,
                                       UserRepository userRepo,
                                       WatchlistService watchlistService) {
        this.cartService = cartService;
        this.orderService = orderService;
        this.alertRepo = alertRepo;
        this.orderRepo = orderRepo;
        this.userRepo = userRepo;
        this.watchlistService = watchlistService;
    }

    @Override
    public ResponseEntity<List<ProcurementFeedItem>> vendorProcurementFeed(Long speciesId, Integer maxAgeMins) {
        Long vendorId = SecurityUtils.currentUserId();
        OffsetDateTime now = OffsetDateTime.now();

        List<com.mermaid.app.domain.CatchAlert> alerts = speciesId != null
                ? alertRepo.findActiveFeedBySpecies(now, speciesId)
                : alertRepo.findActiveFeed(now);

        if (maxAgeMins != null) {
            alerts = alerts.stream()
                    .filter(a -> ChronoUnit.MINUTES.between(a.getCreatedAt(), now) <= maxAgeMins)
                    .collect(Collectors.toList());
        }

        Set<Long> cartAlertIds = cartService.list(vendorId).stream()
                .map(i -> i.getCatchAlert().getId())
                .collect(Collectors.toSet());

        List<com.mermaid.app.domain.VendorWatchlist> watchlist = watchlistService.listForVendor(vendorId);

        List<ProcurementFeedItem> items = alerts.stream()
                .map(a -> {
                    boolean matched = watchlist.stream().anyMatch(
                        w -> matchesWatchlistEntry(w, a));
                    return toFeedItem(a, now, cartAlertIds.contains(a.getId()), matched);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(items);
    }

    @Override
    public ResponseEntity<List<ProcurementCartItemDto>> getProcurementCart() {
        Long vendorId = SecurityUtils.currentUserId();
        List<ProcurementCartItemDto> dtos = cartService.list(vendorId).stream()
                .map(this::toCartDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @Override
    public ResponseEntity<ProcurementCartItemDto> addProcurementCartItem(AddProcurementCartItemRequest req) {
        Long vendorId = SecurityUtils.currentUserId();
        BigDecimal price = req.getOfferedPricePerKg() != null && req.getOfferedPricePerKg().isPresent()
                ? BigDecimal.valueOf(req.getOfferedPricePerKg().get()) : null;
        ProcurementCartItem item = cartService.addOrUpdate(
                vendorId, req.getCatchAlertId(), BigDecimal.valueOf(req.getQtyKg()), price);
        return ResponseEntity.ok(toCartDto(item));
    }

    @Override
    public ResponseEntity<ProcurementCartItemDto> updateProcurementCartItem(Long itemId,
                                                                             UpdateProcurementCartItemRequest req) {
        Long vendorId = SecurityUtils.currentUserId();
        ProcurementCartItem existing = cartService.list(vendorId).stream()
                .filter(i -> i.getId().equals(itemId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found: " + itemId));
        BigDecimal price = req.getOfferedPricePerKg() != null && req.getOfferedPricePerKg().isPresent()
                ? BigDecimal.valueOf(req.getOfferedPricePerKg().get()) : null;
        ProcurementCartItem updated = cartService.addOrUpdate(
                vendorId, existing.getCatchAlert().getId(), BigDecimal.valueOf(req.getQtyKg()), price);
        return ResponseEntity.ok(toCartDto(updated));
    }

    @Override
    public ResponseEntity<Void> removeProcurementCartItem(Long itemId) {
        cartService.remove(SecurityUtils.currentUserId(), itemId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<ProcurementOrderSummary>> checkoutProcurementCart() {
        Long vendorId = SecurityUtils.currentUserId();
        List<com.mermaid.app.domain.Order> orders = orderService.checkout(vendorId);
        return ResponseEntity.ok(orders.stream().map(this::toOrderSummary).collect(Collectors.toList()));
    }

    @Override
    public ResponseEntity<List<ProcurementOrderSummary>> listVendorProcurementOrders(String bucket) {
        Long vendorId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(orderService.listForVendor(vendorId, bucket).stream()
                .map(this::toOrderSummary).collect(Collectors.toList()));
    }

    @Override
    public ResponseEntity<ProcurementOrderSummary> vendorCancelProcurementOrder(Long orderId,
                                                                                  VendorCancelOrderRequest req) {
        Long vendorId = SecurityUtils.currentUserId();
        String reason = req != null ? req.getReason() : null;
        return ResponseEntity.ok(toOrderSummary(orderService.vendorCancel(vendorId, orderId, reason)));
    }

    @Override
    public ResponseEntity<ProcurementOrderSummary> placePreorder(PreorderRequest req) {
        Long vendorId = SecurityUtils.currentUserId();
        String notes = req.getNotes() != null && req.getNotes().isPresent() ? req.getNotes().get() : null;
        com.mermaid.app.domain.Order order = orderService.placePreorder(
                vendorId, req.getFishermanId(), req.getSpeciesId(),
                BigDecimal.valueOf(req.getQtyKg()), BigDecimal.valueOf(req.getPricePerKg()), notes);
        return ResponseEntity.ok(toOrderSummary(order));
    }

    @Override
    public ResponseEntity<List<FishermanSummary>> listPreviousFishermen() {
        Long vendorId = SecurityUtils.currentUserId();
        List<Long> fishermanIds = orderRepo.findDistinctFishermenByVendor(vendorId);
        List<FishermanSummary> result = fishermanIds.stream().map(fid -> {
            FishermanSummary s = new FishermanSummary();
            s.setId(fid);
            s.setName(userRepo.findById(fid).map(User::getFullName).orElse("Fisherman #" + fid));
            return s;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    private boolean matchesWatchlistEntry(com.mermaid.app.domain.VendorWatchlist w,
                                           com.mermaid.app.domain.CatchAlert a) {
        if (w.getSpecies() != null && a.getSpecies() != null
                && w.getSpecies().getId().equals(a.getSpecies().getId())) {
            return true;
        }
        if (w.getMarketLocation() != null && a.getLat() != null && a.getLng() != null) {
            com.mermaid.app.domain.MarketLocation loc = w.getMarketLocation();
            if (loc.getLat() == null || loc.getLng() == null) return false;
            double radius = w.getRadiusKm() != null ? w.getRadiusKm().doubleValue() : 5.0;
            double dLat = Math.toRadians(a.getLat().doubleValue() - loc.getLat().doubleValue());
            double dLng = Math.toRadians(a.getLng().doubleValue() - loc.getLng().doubleValue());
            double aa = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(loc.getLat().doubleValue()))
                * Math.cos(Math.toRadians(a.getLat().doubleValue()))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
            double dist = 6371.0 * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
            return dist <= radius;
        }
        return false;
    }

    private ProcurementFeedItem toFeedItem(com.mermaid.app.domain.CatchAlert a,
                                            OffsetDateTime now, boolean inCart, boolean watchlistMatched) {
        ProcurementFeedItem dto = new ProcurementFeedItem();
        dto.setId(a.getId());
        dto.setFishermanId(a.getFishermanId());
        dto.setFishermanName(JsonNullable.of(
                userRepo.findById(a.getFishermanId()).map(User::getFullName).orElse(null)));
        dto.setSpeciesId(a.getSpecies().getId());
        dto.setSpeciesName(a.getSpecies().getCommonName());
        dto.setClaimedKg(a.getClaimedKg().doubleValue());
        if (a.getQuantityKg() != null) {
            dto.setQuantityKg(JsonNullable.of(a.getQuantityKg().doubleValue()));
            dto.setAvailableKg(JsonNullable.of(a.getQuantityKg().subtract(a.getClaimedKg()).doubleValue()));
        }
        dto.setAskingPricePerKg(JsonNullable.of(
                a.getAskingPricePerKg() != null ? a.getAskingPricePerKg().doubleValue() : null));
        dto.setQuantityEstimate(JsonNullable.of(a.getQuantityEstimate()));
        dto.setLandingSite(JsonNullable.of(a.getLandingSite()));
        dto.setLat(JsonNullable.of(a.getLat() != null ? a.getLat().doubleValue() : null));
        dto.setLng(JsonNullable.of(a.getLng() != null ? a.getLng().doubleValue() : null));
        dto.setNotes(JsonNullable.of(a.getNotes()));
        dto.setExpiresAt(a.getExpiresAt());
        dto.setCreatedAt(a.getCreatedAt());
        dto.setAgeMinutes((int) ChronoUnit.MINUTES.between(a.getCreatedAt(), now));
        dto.setInCart(inCart);
        dto.setWatchlistMatched(watchlistMatched);
        return dto;
    }

    private ProcurementCartItemDto toCartDto(ProcurementCartItem item) {
        com.mermaid.app.domain.CatchAlert alert = item.getCatchAlert();
        ProcurementCartItemDto dto = new ProcurementCartItemDto();
        dto.setId(item.getId());
        dto.setCatchAlertId(alert.getId());
        dto.setFishermanId(alert.getFishermanId());
        dto.setFishermanName(JsonNullable.of(
                userRepo.findById(alert.getFishermanId()).map(User::getFullName).orElse(null)));
        dto.setSpeciesId(alert.getSpecies().getId());
        dto.setSpeciesName(alert.getSpecies().getCommonName());
        dto.setQtyKg(item.getQtyKg().doubleValue());
        dto.setOfferedPricePerKg(JsonNullable.of(
                item.getOfferedPricePerKg() != null ? item.getOfferedPricePerKg().doubleValue() : null));
        if (alert.getQuantityKg() != null) {
            dto.setAvailableKg(JsonNullable.of(
                    alert.getQuantityKg().subtract(alert.getClaimedKg()).doubleValue()));
        }
        return dto;
    }

    private ProcurementOrderSummary toOrderSummary(com.mermaid.app.domain.Order order) {
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
        if (order.getPaymentMethod() != null)
            dto.setPaymentMethod(JsonNullable.of(order.getPaymentMethod()));
        if (order.getSettledAt() != null)
            dto.setSettledAt(JsonNullable.of(order.getSettledAt()));
        return dto;
    }

    @Override
    public ResponseEntity<ProcurementOrderSummary> settleVendorProcurementOrder(Long id, OrderSettleRequest req) {
        throw new UnsupportedOperationException("Not yet implemented — see Task 3.5");
    }
}

package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.exception.InsufficientStockException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class InventoryService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal DEFAULT_LOW_STOCK_KG = new BigDecimal("5.00");
    private static final Duration LOW_STOCK_DEBOUNCE = Duration.ofHours(12);

    private final InventoryLotRepository lotRepo;
    private final InventoryMovementRepository moveRepo;
    private final NotificationService notifications;
    private final StorefrontListingRepository listingRepo;
    private final StorefrontListingLotRepository listingLotRepo;
    private final OrderRepository orderRepo;
    private final FishSpeciesRepository speciesRepo;
    private final NotificationRepository notificationRepo;

    public InventoryService(InventoryLotRepository lotRepo,
                            InventoryMovementRepository moveRepo,
                            NotificationService notifications,
                            StorefrontListingRepository listingRepo,
                            StorefrontListingLotRepository listingLotRepo,
                            OrderRepository orderRepo,
                            FishSpeciesRepository speciesRepo,
                            NotificationRepository notificationRepo) {
        this.lotRepo = lotRepo;
        this.moveRepo = moveRepo;
        this.notifications = notifications;
        this.listingRepo = listingRepo;
        this.listingLotRepo = listingLotRepo;
        this.orderRepo = orderRepo;
        this.speciesRepo = speciesRepo;
        this.notificationRepo = notificationRepo;
    }

    @Transactional
    public InventoryLot addLotFromProcurement(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        InventoryLot lot = new InventoryLot();
        lot.setVendorId(order.getBuyerId());
        lot.setSpeciesId(order.getSpecies().getId());
        lot.setSourceProcurementOrderId(orderId);
        lot.setInitialKg(order.getOrderedQtyKg());
        lot.setRemainingKg(order.getOrderedQtyKg());
        lot.setCostPerKg(order.getAgreedPricePerKg());
        lot = lotRepo.save(lot);

        InventoryMovement movement = new InventoryMovement();
        movement.setLotId(lot.getId());
        movement.setDeltaKg(order.getOrderedQtyKg());
        movement.setReason(MovementReason.PROCUREMENT_RECEIVED);
        movement.setRefOrderId(orderId);
        moveRepo.save(movement);

        return lot;
    }

    @Transactional
    public InventoryLot recordAdjustment(Long lotId, BigDecimal deltaKg, MovementReason reason, String note) {
        List<InventoryLot> locked = lotRepo.findByIdInForUpdate(List.of(lotId));
        InventoryLot lot = locked.stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Inventory lot not found: " + lotId));

        BigDecimal newRemaining = lot.getRemainingKg().add(deltaKg);
        if (newRemaining.compareTo(ZERO) < 0) {
            throw new InsufficientStockException(
                    "Adjustment would result in negative stock for lot " + lotId);
        }
        lot.setRemainingKg(newRemaining);
        lot = lotRepo.save(lot);

        InventoryMovement movement = new InventoryMovement();
        movement.setLotId(lotId);
        movement.setDeltaKg(deltaKg);
        movement.setReason(reason);
        movement.setNote(note);
        moveRepo.save(movement);

        maybeFireLowStock(lot.getVendorId(), lot.getSpeciesId());

        return lot;
    }

    @Transactional(readOnly = true)
    public BigDecimal availableKg(Long vendorId, Long speciesId) {
        BigDecimal sum = lotRepo.sumAvailableByVendorAndSpecies(vendorId, speciesId);
        return sum != null ? sum : ZERO;
    }

    @Transactional(readOnly = true)
    public List<InventoryLot> lotsForVendor(Long vendorId, Long speciesId, boolean includeEmpty) {
        if (speciesId != null) {
            if (includeEmpty) {
                return lotRepo.findByVendorIdAndSpeciesIdAndRemainingKgGreaterThanOrderByReceivedAtAsc(
                        vendorId, speciesId, new BigDecimal("-1"));
            } else {
                return lotRepo.findByVendorIdAndSpeciesIdAndRemainingKgGreaterThanOrderByReceivedAtAsc(
                        vendorId, speciesId, ZERO);
            }
        }
        return lotRepo.findByVendorIdOrderByReceivedAtAsc(vendorId);
    }

    @Transactional
    public void deductForOrder(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        Long listingId = order.getStorefrontListingId();
        if (listingId == null) {
            throw new IllegalStateException("retail order missing storefront_listing_id");
        }

        StorefrontListing listing = listingRepo.findByIdAndIsDeletedFalse(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Storefront listing not found: " + listingId));

        Collection<Long> lotIds = listingLotRepo.findByIdListingId(listingId)
                .stream().map(StorefrontListingLot::getLotId).collect(Collectors.toList());

        List<InventoryLot> lots = lotRepo.findByIdInForUpdate(lotIds);

        BigDecimal need = order.getOrderedQtyKg();
        for (InventoryLot lot : lots) {
            if (need.compareTo(ZERO) <= 0) break;
            if (lot.getRemainingKg().compareTo(ZERO) <= 0) continue;

            BigDecimal take = lot.getRemainingKg().min(need);
            lot.setRemainingKg(lot.getRemainingKg().subtract(take));
            lotRepo.save(lot);

            InventoryMovement movement = new InventoryMovement();
            movement.setLotId(lot.getId());
            movement.setDeltaKg(take.negate());
            movement.setReason(MovementReason.SALE_COMPLETED);
            movement.setRefOrderId(orderId);
            moveRepo.save(movement);

            need = need.subtract(take);
        }

        if (need.compareTo(ZERO) > 0) {
            throw new InsufficientStockException(listingId,
                    order.getOrderedQtyKg(), order.getOrderedQtyKg().subtract(need));
        }

        BigDecimal totalRemaining = lots.stream()
                .map(InventoryLot::getRemainingKg)
                .reduce(ZERO, BigDecimal::add);
        if (totalRemaining.compareTo(ZERO) == 0) {
            listing.setStatus(StorefrontListingStatus.SOLD_OUT);
            listingRepo.save(listing);
        }

        maybeFireLowStock(listing.getVendorId(), listing.getSpeciesId());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> lowStockItems(Long vendorId) {
        List<Long> speciesIds = lotRepo.findDistinctSpeciesIdsByVendor(vendorId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Long sid : speciesIds) {
            BigDecimal available = availableKg(vendorId, sid);
            if (available.compareTo(DEFAULT_LOW_STOCK_KG) < 0) {
                String name = speciesRepo.findById(sid)
                        .map(FishSpecies::getCommonName).orElse("Species #" + sid);
                Map<String, Object> item = new java.util.LinkedHashMap<>();
                item.put("speciesId", sid);
                item.put("speciesName", name);
                item.put("availableKg", available.doubleValue());
                result.add(item);
            }
        }
        return result;
    }

    private void maybeFireLowStock(Long vendorId, Long speciesId) {
        BigDecimal available = availableKg(vendorId, speciesId);
        BigDecimal threshold = DEFAULT_LOW_STOCK_KG;
        if (available.compareTo(threshold) >= 0) return;

        OffsetDateTime since = OffsetDateTime.now().minus(LOW_STOCK_DEBOUNCE);
        if (notificationRepo.existsRecentLowStock(vendorId, speciesId, since)) return;

        String speciesName = speciesRepo.findById(speciesId)
                .map(FishSpecies::getCommonName)
                .orElse("species #" + speciesId);

        notifications.create(vendorId, "LOW_STOCK",
                "Low stock: " + speciesName + " (" + available.stripTrailingZeros().toPlainString() + " kg)",
                Map.of("speciesId", speciesId, "availableKg", available, "thresholdKg", threshold));
    }
}

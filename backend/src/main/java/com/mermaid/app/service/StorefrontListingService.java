package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class StorefrontListingService {

    private final StorefrontListingRepository listingRepo;
    private final StorefrontListingLotRepository listingLotRepo;
    private final InventoryLotRepository lotRepo;
    private final InventoryService inventoryService;
    private final LiveEventPublisher liveEventPublisher;

    public StorefrontListingService(StorefrontListingRepository listingRepo,
                                    StorefrontListingLotRepository listingLotRepo,
                                    InventoryLotRepository lotRepo,
                                    InventoryService inventoryService,
                                    LiveEventPublisher liveEventPublisher) {
        this.listingRepo = listingRepo;
        this.listingLotRepo = listingLotRepo;
        this.lotRepo = lotRepo;
        this.inventoryService = inventoryService;
        this.liveEventPublisher = liveEventPublisher;
    }

    @Transactional
    public StorefrontListing create(Long vendorId, StorefrontListing draft, List<Long> lotIds) {
        validateLots(vendorId, draft.getSpeciesId(), lotIds, false, null);
        validateFreshnessPhotos(draft);
        draft.setVendorId(vendorId);
        draft.setStatus(StorefrontListingStatus.PUBLISHED);
        StorefrontListing saved = listingRepo.save(draft);
        saveLotLinks(saved.getId(), lotIds);
        liveEventPublisher.runAfterCommit(() ->
            liveEventPublisher.pushToUser(vendorId, "INVENTORY_CHANGED", Map.of())
        );
        return saved;
    }

    @Transactional
    public StorefrontListing update(Long vendorId, Long listingId, StorefrontListing patch, List<Long> lotIds) {
        StorefrontListing listing = getOwnedListing(vendorId, listingId);
        if (patch.getTitle() != null) listing.setTitle(patch.getTitle());
        if (patch.getDescription() != null) listing.setDescription(patch.getDescription());
        if (patch.getPhotoUrl() != null) listing.setPhotoUrl(patch.getPhotoUrl());
        if (patch.getPhotoEyes()   != null) listing.setPhotoEyes(patch.getPhotoEyes());
        if (patch.getPhotoGills()  != null) listing.setPhotoGills(patch.getPhotoGills());
        if (patch.getPhotoScales() != null) listing.setPhotoScales(patch.getPhotoScales());
        if (patch.getPhotoBelly()  != null) listing.setPhotoBelly(patch.getPhotoBelly());
        if (patch.getPhotoFlesh()  != null) listing.setPhotoFlesh(patch.getPhotoFlesh());
        if (patch.getPricePerKg() != null) listing.setPricePerKg(patch.getPricePerKg());
        if (patch.getMinQtyKg() != null) listing.setMinQtyKg(patch.getMinQtyKg());
        if (patch.getDeliveryFee() != null) listing.setDeliveryFee(patch.getDeliveryFee());
        if (patch.getSpeciesId() != null) listing.setSpeciesId(patch.getSpeciesId());
        StorefrontListing saved = listingRepo.save(listing);
        // lotIds is always null today (StorefrontListingUpdateRequest omits it);
        // kept for when the API is extended to allow lot reassignment.
        if (lotIds != null && !lotIds.isEmpty()) {
            validateLots(vendorId, saved.getSpeciesId(), lotIds, false, listingId);
            listingLotRepo.deleteAll(listingLotRepo.findByIdListingId(listingId));
            saveLotLinks(listingId, lotIds);
        }
        liveEventPublisher.runAfterCommit(() ->
            liveEventPublisher.pushToUser(vendorId, "INVENTORY_CHANGED", Map.of())
        );
        return saved;
    }

    @Transactional
    public StorefrontListing publish(Long vendorId, Long listingId) {
        StorefrontListing listing = getOwnedListing(vendorId, listingId);
        BigDecimal available = inventoryService.availableKg(vendorId, listing.getSpeciesId());
        if (available.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Cannot publish listing with zero available stock");
        }
        List<StorefrontListingLot> lots = listingLotRepo.findByIdListingId(listingId);
        boolean anyWithStock = lots.stream().anyMatch(ll -> {
            InventoryLot lot = lotRepo.findById(ll.getLotId()).orElse(null);
            return lot != null && lot.getRemainingKg().compareTo(BigDecimal.ZERO) > 0;
        });
        if (!anyWithStock) {
            throw new IllegalArgumentException("Cannot publish listing: no lots with remaining stock");
        }
        validateFreshnessPhotos(listing);
        listing.setStatus(StorefrontListingStatus.PUBLISHED);
        StorefrontListing saved = listingRepo.save(listing);
        liveEventPublisher.runAfterCommit(() ->
            liveEventPublisher.pushToUser(vendorId, "INVENTORY_CHANGED", Map.of())
        );
        return saved;
    }

    @Transactional
    public StorefrontListing unpublish(Long vendorId, Long listingId) {
        StorefrontListing listing = getOwnedListing(vendorId, listingId);
        listing.setStatus(StorefrontListingStatus.UNPUBLISHED);
        StorefrontListing saved = listingRepo.save(listing);
        liveEventPublisher.runAfterCommit(() ->
            liveEventPublisher.pushToUser(vendorId, "INVENTORY_CHANGED", Map.of())
        );
        return saved;
    }

    @Transactional
    public void delete(Long vendorId, Long listingId) {
        StorefrontListing listing = getOwnedListing(vendorId, listingId);
        listing.setDeleted(true);
        listingRepo.save(listing);
        liveEventPublisher.runAfterCommit(() ->
            liveEventPublisher.pushToUser(vendorId, "INVENTORY_CHANGED", Map.of())
        );
    }

    @Transactional(readOnly = true)
    public List<StorefrontListing> listForVendor(Long vendorId) {
        return listingRepo.findByVendorIdAndIsDeletedFalse(vendorId);
    }

    @Transactional(readOnly = true)
    public List<StorefrontListing> listForBuyerMarketplace(Long speciesId, Long vendorId, String search) {
        return listingRepo.findByStatusAndIsDeletedFalse(StorefrontListingStatus.PUBLISHED)
                .stream()
                .filter(l -> speciesId == null || speciesId.equals(l.getSpeciesId()))
                .filter(l -> vendorId == null || vendorId.equals(l.getVendorId()))
                .filter(l -> search == null || l.getTitle().toLowerCase().contains(search.toLowerCase()))
                .filter(l -> inventoryService.effectiveAvailableKg(l)
                        .compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StorefrontListing getByIdForBuyer(Long listingId) {
        return listingRepo.findByIdAndIsDeletedFalse(listingId)
                .filter(l -> l.getStatus() == StorefrontListingStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + listingId));
    }

    @Transactional
    public void incrementViewCount(Long listingId) {
        listingRepo.findByIdAndIsDeletedFalse(listingId).ifPresent(l -> {
            l.setViewCount(l.getViewCount() + 1);
            listingRepo.save(l);
        });
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStorefrontStats(Long vendorId) {
        List<StorefrontListing> listings = listingRepo.findByVendorIdAndIsDeletedFalse(vendorId);
        int totalViews = listings.stream().mapToInt(StorefrontListing::getViewCount).sum();
        List<Map<String, Object>> byListing = listings.stream()
            .map(l -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("listingId", l.getId());
                m.put("views", l.getViewCount());
                return m;
            })
            .toList();
        return Map.of("totalViews", totalViews, "byListing", byListing);
    }

    private StorefrontListing getOwnedListing(Long vendorId, Long listingId) {
        StorefrontListing listing = listingRepo.findByIdAndIsDeletedFalse(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + listingId));
        if (!vendorId.equals(listing.getVendorId())) {
            throw new ResourceNotFoundException("Listing not found: " + listingId);
        }
        return listing;
    }

    private void validateLots(Long vendorId, Long speciesId, List<Long> lotIds, boolean allowEmpty, Long excludeListingId) {
        for (Long lotId : lotIds) {
            InventoryLot lot = lotRepo.findById(lotId)
                    .orElseThrow(() -> new IllegalArgumentException("Lot not found: " + lotId));
            if (!vendorId.equals(lot.getVendorId())) {
                throw new IllegalArgumentException("Lot " + lotId + " does not belong to vendor");
            }
            if (!speciesId.equals(lot.getSpeciesId())) {
                throw new IllegalArgumentException("Lot " + lotId + " species mismatch");
            }
            if (!allowEmpty && lot.getRemainingKg().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Lot " + lotId + " has no remaining stock");
            }
            if (excludeListingId == null) {
                if (listingLotRepo.existsByLotIdInActiveListing(lotId)) {
                    throw new IllegalStateException("Lot " + lotId + " is already assigned to an existing listing");
                }
            } else {
                if (listingLotRepo.existsByLotIdInActiveListingExcluding(lotId, excludeListingId)) {
                    throw new IllegalStateException("Lot " + lotId + " is already assigned to an existing listing");
                }
            }
        }
    }

    private void saveLotLinks(Long listingId, List<Long> lotIds) {
        lotIds.forEach(lotId -> listingLotRepo.save(new StorefrontListingLot(listingId, lotId)));
    }

    private void validateFreshnessPhotos(StorefrontListing listing) {
        if (isBlank(listing.getPhotoEyes()) ||
            isBlank(listing.getPhotoGills()) ||
            isBlank(listing.getPhotoScales()) ||
            isBlank(listing.getPhotoBelly()) ||
            isBlank(listing.getPhotoFlesh())) {
            throw new IllegalStateException("All 5 freshness photos are required before publishing");
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}

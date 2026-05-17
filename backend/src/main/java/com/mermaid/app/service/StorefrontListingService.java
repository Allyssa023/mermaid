package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StorefrontListingService {

    private final StorefrontListingRepository listingRepo;
    private final StorefrontListingLotRepository listingLotRepo;
    private final InventoryLotRepository lotRepo;
    private final InventoryService inventoryService;

    public StorefrontListingService(StorefrontListingRepository listingRepo,
                                    StorefrontListingLotRepository listingLotRepo,
                                    InventoryLotRepository lotRepo,
                                    InventoryService inventoryService) {
        this.listingRepo = listingRepo;
        this.listingLotRepo = listingLotRepo;
        this.lotRepo = lotRepo;
        this.inventoryService = inventoryService;
    }

    @Transactional
    public StorefrontListing create(Long vendorId, StorefrontListing draft, List<Long> lotIds) {
        validateLots(vendorId, draft.getSpeciesId(), lotIds, false, null);
        draft.setVendorId(vendorId);
        draft.setStatus(StorefrontListingStatus.DRAFT);
        StorefrontListing saved = listingRepo.save(draft);
        saveLotLinks(saved.getId(), lotIds);
        return saved;
    }

    @Transactional
    public StorefrontListing update(Long vendorId, Long listingId, StorefrontListing patch, List<Long> lotIds) {
        StorefrontListing listing = getOwnedListing(vendorId, listingId);
        if (patch.getTitle() != null) listing.setTitle(patch.getTitle());
        if (patch.getDescription() != null) listing.setDescription(patch.getDescription());
        if (patch.getPhotoUrl() != null) listing.setPhotoUrl(patch.getPhotoUrl());
        if (patch.getPricePerKg() != null) listing.setPricePerKg(patch.getPricePerKg());
        if (patch.getMinQtyKg() != null) listing.setMinQtyKg(patch.getMinQtyKg());
        if (patch.getSpeciesId() != null) listing.setSpeciesId(patch.getSpeciesId());
        StorefrontListing saved = listingRepo.save(listing);
        // lotIds is always null today (StorefrontListingUpdateRequest omits it);
        // kept for when the API is extended to allow lot reassignment.
        if (lotIds != null && !lotIds.isEmpty()) {
            validateLots(vendorId, saved.getSpeciesId(), lotIds, false, listingId);
            listingLotRepo.deleteAll(listingLotRepo.findByIdListingId(listingId));
            saveLotLinks(listingId, lotIds);
        }
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
        listing.setStatus(StorefrontListingStatus.PUBLISHED);
        return listingRepo.save(listing);
    }

    @Transactional
    public StorefrontListing unpublish(Long vendorId, Long listingId) {
        StorefrontListing listing = getOwnedListing(vendorId, listingId);
        listing.setStatus(StorefrontListingStatus.UNPUBLISHED);
        return listingRepo.save(listing);
    }

    @Transactional
    public void delete(Long vendorId, Long listingId) {
        StorefrontListing listing = getOwnedListing(vendorId, listingId);
        listing.setDeleted(true);
        listingRepo.save(listing);
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
                .filter(l -> inventoryService.availableKg(l.getVendorId(), l.getSpeciesId())
                        .compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StorefrontListing getByIdForBuyer(Long listingId) {
        return listingRepo.findByIdAndIsDeletedFalse(listingId)
                .filter(l -> l.getStatus() == StorefrontListingStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + listingId));
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
}

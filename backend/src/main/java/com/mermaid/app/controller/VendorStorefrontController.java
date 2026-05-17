package com.mermaid.app.controller;

import com.mermaid.app.api.VendorStorefrontApi;
import com.mermaid.app.domain.StorefrontListing;
import com.mermaid.app.mapper.StorefrontListingMapper;
import com.mermaid.app.model.StorefrontListingRequest;
import com.mermaid.app.model.StorefrontListingUpdateRequest;
import com.mermaid.app.model.StorefrontListingResponse;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.InventoryService;
import com.mermaid.app.service.StorefrontListingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@PreAuthorize("hasRole('VENDOR')")
public class VendorStorefrontController implements VendorStorefrontApi {

    private final StorefrontListingService service;
    private final StorefrontListingMapper mapper;
    private final InventoryService inventoryService;

    public VendorStorefrontController(StorefrontListingService service,
                                      StorefrontListingMapper mapper,
                                      InventoryService inventoryService) {
        this.service = service;
        this.mapper = mapper;
        this.inventoryService = inventoryService;
    }

    @Override
    public ResponseEntity<List<StorefrontListingResponse>> vendorListStorefrontListings() {
        Long vendorId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(
                service.listForVendor(vendorId).stream()
                        .map(l -> mapper.toDto(l, inventoryService.availableKg(vendorId, l.getSpeciesId())))
                        .collect(Collectors.toList())
        );
    }

    @Override
    public ResponseEntity<StorefrontListingResponse> vendorCreateStorefrontListing(
            StorefrontListingRequest request) {
        Long vendorId = SecurityUtils.currentUserId();
        StorefrontListing draft = fromRequest(request);
        StorefrontListing saved = service.create(vendorId, draft, request.getLotIds());
        return ResponseEntity.status(201).body(
                mapper.toDto(saved, inventoryService.availableKg(vendorId, saved.getSpeciesId())));
    }

    @Override
    public ResponseEntity<StorefrontListingResponse> vendorGetStorefrontListing(Long listingId) {
        Long vendorId = SecurityUtils.currentUserId();
        List<StorefrontListing> listings = service.listForVendor(vendorId);
        StorefrontListing listing = listings.stream()
                .filter(l -> l.getId().equals(listingId))
                .findFirst()
                .orElseThrow(() -> new com.mermaid.app.exception.ResourceNotFoundException(
                        "Listing not found: " + listingId));
        return ResponseEntity.ok(
                mapper.toDto(listing, inventoryService.availableKg(vendorId, listing.getSpeciesId())));
    }

    @Override
    public ResponseEntity<StorefrontListingResponse> vendorUpdateStorefrontListing(
            Long listingId, StorefrontListingUpdateRequest request) {
        Long vendorId = SecurityUtils.currentUserId();
        StorefrontListing patch = fromUpdateRequest(request);
        StorefrontListing saved = service.update(vendorId, listingId, patch, null);
        return ResponseEntity.ok(
                mapper.toDto(saved, inventoryService.availableKg(vendorId, saved.getSpeciesId())));
    }

    @Override
    public ResponseEntity<Void> vendorDeleteStorefrontListing(Long listingId) {
        service.delete(SecurityUtils.currentUserId(), listingId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<StorefrontListingResponse> vendorPublishStorefrontListing(Long listingId) {
        Long vendorId = SecurityUtils.currentUserId();
        StorefrontListing listing = service.publish(vendorId, listingId);
        return ResponseEntity.ok(
                mapper.toDto(listing, inventoryService.availableKg(vendorId, listing.getSpeciesId())));
    }

    @Override
    public ResponseEntity<StorefrontListingResponse> vendorUnpublishStorefrontListing(Long listingId) {
        Long vendorId = SecurityUtils.currentUserId();
        StorefrontListing listing = service.unpublish(vendorId, listingId);
        return ResponseEntity.ok(
                mapper.toDto(listing, inventoryService.availableKg(vendorId, listing.getSpeciesId())));
    }

    private StorefrontListing fromRequest(StorefrontListingRequest req) {
        StorefrontListing entity = new StorefrontListing();
        entity.setSpeciesId(req.getSpeciesId());
        entity.setTitle(req.getTitle());
        if (req.getDescription() != null && req.getDescription().isPresent())
            entity.setDescription(req.getDescription().get());
        if (req.getPhotoUrl() != null && req.getPhotoUrl().isPresent())
            entity.setPhotoUrl(req.getPhotoUrl().get());
        if (req.getPricePerKg() != null)
            entity.setPricePerKg(BigDecimal.valueOf(req.getPricePerKg()));
        if (req.getMinQtyKg() != null)
            entity.setMinQtyKg(BigDecimal.valueOf(req.getMinQtyKg()));
        if (req.getDeliveryFee() != null)
            entity.setDeliveryFee(BigDecimal.valueOf(req.getDeliveryFee()));
        return entity;
    }

    private StorefrontListing fromUpdateRequest(StorefrontListingUpdateRequest req) {
        StorefrontListing entity = new StorefrontListing();
        entity.setTitle(req.getTitle());
        if (req.getDescription() != null && req.getDescription().isPresent())
            entity.setDescription(req.getDescription().get());
        if (req.getPhotoUrl() != null && req.getPhotoUrl().isPresent())
            entity.setPhotoUrl(req.getPhotoUrl().get());
        if (req.getPricePerKg() != null)
            entity.setPricePerKg(BigDecimal.valueOf(req.getPricePerKg()));
        if (req.getMinQtyKg() != null)
            entity.setMinQtyKg(BigDecimal.valueOf(req.getMinQtyKg()));
        if (req.getDeliveryFee() != null)
            entity.setDeliveryFee(BigDecimal.valueOf(req.getDeliveryFee()));
        return entity;
    }
}

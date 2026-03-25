package com.mermaid.app.controller;

import com.mermaid.app.api.VendorDemandListingsApi;
import com.mermaid.app.model.DemandListing;
import com.mermaid.app.model.DemandListingCreateRequest;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.model.DemandListingUpdateRequest;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.DemandListingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('VENDOR')")
public class VendorDemandListingController implements VendorDemandListingsApi {

    private final DemandListingService service;

    public VendorDemandListingController(DemandListingService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<List<DemandListing>> vendorListDemandListings(DemandListingStatus status) {
        return ResponseEntity.ok(service.listOwn(SecurityUtils.currentUserId(), status));
    }

    @Override
    public ResponseEntity<DemandListing> vendorCreateDemandListing(DemandListingCreateRequest request) {
        return ResponseEntity.status(201).body(service.create(request, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<DemandListing> vendorGetDemandListingById(Long listingId) {
        return ResponseEntity.ok(service.getById(listingId, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<DemandListing> vendorUpdateDemandListing(Long listingId,
                                                                     DemandListingUpdateRequest request) {
        return ResponseEntity.ok(service.update(listingId, SecurityUtils.currentUserId(), request));
    }

    @Override
    public ResponseEntity<Void> vendorDeleteDemandListing(Long listingId) {
        service.delete(listingId, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<DemandListing> vendorCloseDemandListing(Long listingId) {
        return ResponseEntity.ok(service.close(listingId, SecurityUtils.currentUserId()));
    }
}

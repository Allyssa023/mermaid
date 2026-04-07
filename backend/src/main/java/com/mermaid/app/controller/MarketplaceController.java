package com.mermaid.app.controller;

import com.mermaid.app.api.MarketplaceApi;
import com.mermaid.app.model.DemandListing;
import com.mermaid.app.model.ListingInterest;
import com.mermaid.app.model.ListingInterestDetail;
import com.mermaid.app.model.ListingInterestRequest;
import com.mermaid.app.model.OfferLookupItem;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.ListingInterestService;
import com.mermaid.app.service.MarketplaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class MarketplaceController implements MarketplaceApi {

    private final MarketplaceService service;
    private final ListingInterestService interestService;

    public MarketplaceController(MarketplaceService service,
                                  ListingInterestService interestService) {
        this.service         = service;
        this.interestService = interestService;
    }

    @Override
    public ResponseEntity<List<DemandListing>> browseMarketplaceListings(
            Long speciesId, Long locationId, Double minOfferPrice, Double maxOfferPrice) {
        return ResponseEntity.ok(service.browseListings(speciesId, locationId, minOfferPrice, maxOfferPrice));
    }

    @Override
    public ResponseEntity<List<OfferLookupItem>> lookupActiveOffers(Long speciesId, Long locationId) {
        return ResponseEntity.ok(service.lookupOffers(speciesId, locationId));
    }

    @Override
    public ResponseEntity<ListingInterest> expressInterestInListing(
            Long listingId, ListingInterestRequest request) {
        Long fishermanId = SecurityUtils.currentUserId();
        return ResponseEntity.status(201)
            .body(interestService.express(listingId, fishermanId, request.getMessage()));
    }

    @Override
    public ResponseEntity<List<ListingInterestDetail>> getMyInterests() {
        return ResponseEntity.ok(interestService.myInterests(SecurityUtils.currentUserId()));
    }
}

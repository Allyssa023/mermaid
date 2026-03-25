package com.mermaid.app.controller;

import com.mermaid.app.api.MarketplaceApi;
import com.mermaid.app.model.DemandListing;
import com.mermaid.app.model.OfferLookupItem;
import com.mermaid.app.service.MarketplaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class MarketplaceController implements MarketplaceApi {

    private final MarketplaceService service;

    public MarketplaceController(MarketplaceService service) {
        this.service = service;
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
}

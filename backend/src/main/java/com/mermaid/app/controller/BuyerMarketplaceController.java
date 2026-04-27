package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerMarketplaceApi;
import com.mermaid.app.model.DemandListing;
import com.mermaid.app.service.MarketplaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class BuyerMarketplaceController implements BuyerMarketplaceApi {

    private final MarketplaceService service;

    public BuyerMarketplaceController(MarketplaceService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<List<DemandListing>> getBuyerMarketplaceListings(
            Long speciesId, Long locationId, Double minOfferPrice, Double maxOfferPrice) {
        return ResponseEntity.ok(
            service.browseListings(speciesId, locationId, minOfferPrice, maxOfferPrice));
    }
}

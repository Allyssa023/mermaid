package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerMarketplaceApi;
import com.mermaid.app.model.BuyerListingDetail;
import com.mermaid.app.model.PagedStorefrontListings;
import com.mermaid.app.service.MarketplaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BuyerMarketplaceController implements BuyerMarketplaceApi {

    private final MarketplaceService service;

    public BuyerMarketplaceController(MarketplaceService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<PagedStorefrontListings> getBuyerMarketplaceListings(
            String q, Long speciesId, Long vendorId, Integer page, Integer size) {
        return ResponseEntity.ok(
                service.searchStorefrontListings(q, speciesId, vendorId, page, size));
    }

    @Override
    public ResponseEntity<BuyerListingDetail> getBuyerListingDetail(Long listingId) {
        return ResponseEntity.ok(service.getStorefrontListingDetail(listingId));
    }
}

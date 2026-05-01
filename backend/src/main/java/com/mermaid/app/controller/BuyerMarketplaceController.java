package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerMarketplaceApi;
import com.mermaid.app.model.BuyerListingDetail;
import com.mermaid.app.model.BuyerListingSort;
import com.mermaid.app.model.PagedDemandListings;
import com.mermaid.app.service.MarketplaceService;
import com.mermaid.app.service.MarketplaceService.BuyerMarketplaceFilter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BuyerMarketplaceController implements BuyerMarketplaceApi {

    private final MarketplaceService service;

    public BuyerMarketplaceController(MarketplaceService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<PagedDemandListings> getBuyerMarketplaceListings(
            String q,
            Long speciesId,
            Long locationId,
            Double minOfferPrice,
            Double maxOfferPrice,
            Double lat,
            Double lng,
            Double maxDistanceKm,
            BuyerListingSort sort,
            Integer page,
            Integer size) {
        return ResponseEntity.ok(service.searchListings(new BuyerMarketplaceFilter(
                q, speciesId, locationId, minOfferPrice, maxOfferPrice,
                lat, lng, maxDistanceKm, sort, page, size)));
    }

    @Override
    public ResponseEntity<BuyerListingDetail> getBuyerListingDetail(Long listingId) {
        return ResponseEntity.ok(service.getListingDetail(listingId));
    }
}

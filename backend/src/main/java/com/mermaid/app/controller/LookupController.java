package com.mermaid.app.controller;

import com.mermaid.app.api.LookupsApi;
import com.mermaid.app.model.FishSpecies;
import com.mermaid.app.model.MarketLocation;
import com.mermaid.app.service.FishSpeciesService;
import com.mermaid.app.service.MarketLocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class LookupController implements LookupsApi {

    private final FishSpeciesService fishSpeciesService;
    private final MarketLocationService marketLocationService;

    public LookupController(FishSpeciesService fishSpeciesService,
                            MarketLocationService marketLocationService) {
        this.fishSpeciesService = fishSpeciesService;
        this.marketLocationService = marketLocationService;
    }

    @Override
    public ResponseEntity<List<FishSpecies>> listFishSpecies() {
        return ResponseEntity.ok(fishSpeciesService.listActive());
    }

    @Override
    public ResponseEntity<List<MarketLocation>> listMarketLocations() {
        return ResponseEntity.ok(marketLocationService.listActive());
    }
}

package com.mermaid.app.controller;

import com.github.benmanes.caffeine.cache.Cache;
import com.mermaid.app.api.MarineApi;
import com.mermaid.app.client.MarineServiceClient;
import com.mermaid.app.mapper.MarineConditionsMapper;
import com.mermaid.app.model.AllMarineConditionsResponse;
import com.mermaid.app.model.MarineConditionsResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MarineController implements MarineApi {

    private static final String CACHE_KEY = "all";

    private final MarineServiceClient client;
    private final MarineConditionsMapper mapper;
    private final Cache<String, AllMarineConditionsResponse> cache;

    public MarineController(
            MarineServiceClient client,
            MarineConditionsMapper mapper,
            Cache<String, AllMarineConditionsResponse> cache) {
        this.client = client;
        this.mapper = mapper;
        this.cache = cache;
    }

    @Override
    public ResponseEntity<AllMarineConditionsResponse> getAllMarineConditions() {
        AllMarineConditionsResponse cached = cache.getIfPresent(CACHE_KEY);
        if (cached != null) return ResponseEntity.ok(cached);

        AllMarineConditionsResponse response = mapper.toAllResponse(client.getAllConditions());
        cache.put(CACHE_KEY, response);
        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<MarineConditionsResponse> getMarineConditionsByZone(String zoneId) {
        // Goes direct to client — marine service has its own 15-min cache.
        // Java-side caching is only on the all-zones aggregate to absorb dashboard load spikes.
        return ResponseEntity.ok(mapper.toResponse(client.getZoneConditions(zoneId)));
    }
}

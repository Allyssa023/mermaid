package com.mermaid.app.controller;

import com.mermaid.app.api.VendorWatchlistApi;
import com.mermaid.app.domain.VendorWatchlist;
import com.mermaid.app.model.VendorWatchlistEntry;
import com.mermaid.app.model.VendorWatchlistRequest;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.WatchlistService;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@PreAuthorize("hasRole('VENDOR')")
public class VendorWatchlistController implements VendorWatchlistApi {

    private final WatchlistService watchlistService;

    public VendorWatchlistController(WatchlistService watchlistService) {
        this.watchlistService = watchlistService;
    }

    @Override
    public ResponseEntity<List<VendorWatchlistEntry>> listVendorWatchlist() {
        Long vendorId = SecurityUtils.currentUserId();
        List<VendorWatchlistEntry> result = watchlistService.listForVendor(vendorId)
            .stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @Override
    public ResponseEntity<VendorWatchlistEntry> addVendorWatchlist(VendorWatchlistRequest req) {
        Long vendorId = SecurityUtils.currentUserId();
        Long speciesId = req.getSpeciesId() != null && req.getSpeciesId().isPresent()
            ? req.getSpeciesId().get() : null;
        Long locationId = req.getMarketLocationId() != null && req.getMarketLocationId().isPresent()
            ? req.getMarketLocationId().get() : null;
        BigDecimal radius = req.getRadiusKm() != null && req.getRadiusKm().isPresent() && req.getRadiusKm().get() != null
            ? BigDecimal.valueOf(req.getRadiusKm().get()) : null;
        VendorWatchlist saved = watchlistService.add(vendorId, speciesId, locationId, radius);
        return ResponseEntity.ok(toDto(saved));
    }

    @Override
    public ResponseEntity<Void> deleteVendorWatchlist(Long id) {
        Long vendorId = SecurityUtils.currentUserId();
        watchlistService.remove(vendorId, id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<VendorWatchlistEntry> updateVendorWatchlist(Long id, VendorWatchlistRequest vendorWatchlistRequest) {
        throw new UnsupportedOperationException("Not yet implemented");
    }

    private VendorWatchlistEntry toDto(VendorWatchlist w) {
        VendorWatchlistEntry dto = new VendorWatchlistEntry(w.getId(), w.getCreatedAt());
        if (w.getSpecies() != null) {
            dto.setSpeciesId(JsonNullable.of(w.getSpecies().getId()));
            dto.setSpeciesName(JsonNullable.of(w.getSpecies().getCommonName()));
        }
        if (w.getMarketLocation() != null) {
            dto.setMarketLocationId(JsonNullable.of(w.getMarketLocation().getId()));
            dto.setMarketLocationName(JsonNullable.of(w.getMarketLocation().getName()));
        }
        if (w.getRadiusKm() != null) {
            dto.setRadiusKm(JsonNullable.of(w.getRadiusKm().doubleValue()));
        }
        return dto;
    }
}

package com.mermaid.app.service;

import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.MarketLocation;
import com.mermaid.app.domain.VendorWatchlist;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.MarketLocationRepository;
import com.mermaid.app.repository.VendorWatchlistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WatchlistService {

    private static final double DEFAULT_RADIUS_KM = 5.0;
    private static final double EARTH_RADIUS_KM = 6371.0;

    private final VendorWatchlistRepository watchlistRepo;
    private final FishSpeciesRepository speciesRepo;
    private final MarketLocationRepository locationRepo;

    public WatchlistService(VendorWatchlistRepository watchlistRepo,
                            FishSpeciesRepository speciesRepo,
                            MarketLocationRepository locationRepo) {
        this.watchlistRepo = watchlistRepo;
        this.speciesRepo = speciesRepo;
        this.locationRepo = locationRepo;
    }

    @Transactional(readOnly = true)
    public List<VendorWatchlist> listForVendor(Long vendorId) {
        return watchlistRepo.findByVendorIdAndIsDeletedFalse(vendorId);
    }

    @Transactional
    public VendorWatchlist add(Long vendorId, Long speciesId, Long marketLocationId, BigDecimal radiusKm) {
        if (speciesId == null && marketLocationId == null) {
            throw new IllegalArgumentException("At least one of speciesId or marketLocationId is required.");
        }

        FishSpecies species = null;
        if (speciesId != null) {
            species = speciesRepo.findById(speciesId)
                .orElseThrow(() -> new ResourceNotFoundException("FishSpecies not found: " + speciesId));
        }

        MarketLocation location = null;
        if (marketLocationId != null) {
            location = locationRepo.findById(marketLocationId)
                .orElseThrow(() -> new ResourceNotFoundException("MarketLocation not found: " + marketLocationId));
        }

        // Deduplication: reject if an active identical subscription already exists
        final Long finalSpeciesId = speciesId;
        final Long finalLocationId = marketLocationId;
        boolean duplicate = watchlistRepo.findByVendorIdAndIsDeletedFalse(vendorId).stream().anyMatch(w -> {
            boolean sameSpecies = finalSpeciesId != null && w.getSpecies() != null
                && w.getSpecies().getId().equals(finalSpeciesId);
            boolean sameLocation = finalLocationId != null && w.getMarketLocation() != null
                && w.getMarketLocation().getId().equals(finalLocationId);
            return sameSpecies || sameLocation;
        });
        if (duplicate) {
            throw new IllegalArgumentException("Watchlist subscription already exists.");
        }

        VendorWatchlist entry = new VendorWatchlist();
        entry.setVendorId(vendorId);
        entry.setSpecies(species);
        entry.setMarketLocation(location);
        entry.setRadiusKm(radiusKm);
        return watchlistRepo.save(entry);
    }

    @Transactional
    public VendorWatchlist update(Long vendorId, Long watchlistId,
                                  Long speciesId, Long marketLocationId, BigDecimal radiusKm) {
        VendorWatchlist entry = watchlistRepo.findById(watchlistId)
            .orElseThrow(() -> new ResourceNotFoundException("Watchlist entry not found: " + watchlistId));
        if (!entry.getVendorId().equals(vendorId) || entry.isDeleted()) {
            throw new ResourceNotFoundException("Watchlist entry not found: " + watchlistId);
        }
        if (speciesId != null) {
            FishSpecies species = speciesRepo.findById(speciesId)
                .orElseThrow(() -> new ResourceNotFoundException("FishSpecies not found: " + speciesId));
            entry.setSpecies(species);
        }
        if (marketLocationId != null) {
            MarketLocation location = locationRepo.findById(marketLocationId)
                .orElseThrow(() -> new ResourceNotFoundException("MarketLocation not found: " + marketLocationId));
            entry.setMarketLocation(location);
        }
        if (radiusKm != null) {
            entry.setRadiusKm(radiusKm);
        }
        return watchlistRepo.save(entry);
    }

    @Transactional
    public void remove(Long vendorId, Long watchlistId) {
        VendorWatchlist entry = watchlistRepo.findById(watchlistId)
            .orElseThrow(() -> new ResourceNotFoundException("Watchlist entry not found: " + watchlistId));
        if (!entry.getVendorId().equals(vendorId)) {
            throw new ResourceNotFoundException("Watchlist entry not found: " + watchlistId);
        }
        entry.setDeleted(true);
        watchlistRepo.save(entry);
    }

    @Transactional(readOnly = true)
    public boolean matches(Long vendorId, CatchAlert alert) {
        List<VendorWatchlist> entries = watchlistRepo.findByVendorIdAndIsDeletedFalse(vendorId);
        return entries.stream().anyMatch(w -> matchesEntry(w, alert));
    }

    @Transactional(readOnly = true)
    public List<Long> vendorsMatching(CatchAlert alert) {
        List<VendorWatchlist> candidates = alert.getSpecies() != null
            ? watchlistRepo.findActiveMatchingSpeciesOrHasLocation(alert.getSpecies().getId())
            : List.of();
        return candidates.stream()
            .filter(w -> matchesEntry(w, alert))
            .map(VendorWatchlist::getVendorId)
            .distinct()
            .collect(Collectors.toList());
    }

    private boolean matchesEntry(VendorWatchlist w, CatchAlert alert) {
        if (w.getSpecies() != null && alert.getSpecies() != null
                && w.getSpecies().getId().equals(alert.getSpecies().getId())) {
            return true;
        }
        if (w.getMarketLocation() != null && alert.getLat() != null && alert.getLng() != null) {
            MarketLocation loc = w.getMarketLocation();
            if (loc.getLat() == null || loc.getLng() == null) return false;
            double radiusKm = w.getRadiusKm() != null ? w.getRadiusKm().doubleValue() : DEFAULT_RADIUS_KM;
            double dist = haversineKm(
                loc.getLat().doubleValue(), loc.getLng().doubleValue(),
                alert.getLat().doubleValue(), alert.getLng().doubleValue());
            return dist <= radiusKm;
        }
        return false;
    }

    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}

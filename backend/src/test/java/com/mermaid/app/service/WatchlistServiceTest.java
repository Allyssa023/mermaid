package com.mermaid.app.service;

import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.MarketLocation;
import com.mermaid.app.domain.VendorWatchlist;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.MarketLocationRepository;
import com.mermaid.app.repository.VendorWatchlistRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WatchlistServiceTest {

    @Mock VendorWatchlistRepository watchlistRepo;
    @Mock FishSpeciesRepository speciesRepo;
    @Mock MarketLocationRepository locationRepo;
    @InjectMocks WatchlistService service;

    @Test
    void add_requiresAtLeastOneOf_speciesOrLocation() {
        assertThrows(IllegalArgumentException.class,
            () -> service.add(1L, null, null, null));
        verify(watchlistRepo, never()).save(any());
    }

    @Test
    void add_speciesOnly_savesEntry() {
        FishSpecies species = species(10L);
        when(speciesRepo.findById(10L)).thenReturn(Optional.of(species));
        when(watchlistRepo.findByVendorIdAndIsDeletedFalse(1L)).thenReturn(List.of());
        VendorWatchlist saved = new VendorWatchlist();
        saved.setId(1L);
        when(watchlistRepo.save(any())).thenReturn(saved);

        VendorWatchlist result = service.add(1L, 10L, null, null);
        assertNotNull(result);
        verify(watchlistRepo).save(any());
    }

    @Test
    void add_duplicateSpecies_throwsIllegalArgument() {
        FishSpecies species = species(10L);
        when(speciesRepo.findById(10L)).thenReturn(Optional.of(species));
        VendorWatchlist existing = watchlistWithSpecies(10L);
        when(watchlistRepo.findByVendorIdAndIsDeletedFalse(1L)).thenReturn(List.of(existing));

        assertThrows(IllegalArgumentException.class, () -> service.add(1L, 10L, null, null));
        verify(watchlistRepo, never()).save(any());
    }

    @Test
    void matches_bySpecies_returnsTrue() {
        FishSpecies species = species(10L);
        VendorWatchlist w = watchlistWithSpecies(10L);
        when(watchlistRepo.findByVendorIdAndIsDeletedFalse(1L)).thenReturn(List.of(w));

        CatchAlert alert = catchAlert(species);
        assertTrue(service.matches(1L, alert));
    }

    @Test
    void matches_differentSpecies_returnsFalse() {
        VendorWatchlist w = watchlistWithSpecies(10L);
        when(watchlistRepo.findByVendorIdAndIsDeletedFalse(1L)).thenReturn(List.of(w));

        CatchAlert alert = catchAlert(species(99L));
        assertFalse(service.matches(1L, alert));
    }

    @Test
    void matches_locationWithinRadius_returnsTrue() {
        MarketLocation loc = location(16.4023, 120.5960);
        VendorWatchlist w = watchlistWithLocation(loc, BigDecimal.valueOf(5.0));
        when(watchlistRepo.findByVendorIdAndIsDeletedFalse(1L)).thenReturn(List.of(w));

        CatchAlert alert = new CatchAlert();
        alert.setLat(BigDecimal.valueOf(16.4100));
        alert.setLng(BigDecimal.valueOf(120.5900));

        assertTrue(service.matches(1L, alert));
    }

    @Test
    void matches_locationOutsideRadius_returnsFalse() {
        MarketLocation loc = location(16.4023, 120.5960);
        VendorWatchlist w = watchlistWithLocation(loc, BigDecimal.valueOf(1.0));
        when(watchlistRepo.findByVendorIdAndIsDeletedFalse(1L)).thenReturn(List.of(w));

        // ~50 km away
        CatchAlert alert = new CatchAlert();
        alert.setLat(BigDecimal.valueOf(16.0000));
        alert.setLng(BigDecimal.valueOf(120.0000));

        assertFalse(service.matches(1L, alert));
    }

    private FishSpecies species(Long id) {
        FishSpecies s = new FishSpecies();
        s.setId(id);
        s.setCommonName("Species-" + id);
        return s;
    }

    private CatchAlert catchAlert(FishSpecies species) {
        CatchAlert a = new CatchAlert();
        a.setSpecies(species);
        return a;
    }

    private VendorWatchlist watchlistWithSpecies(Long speciesId) {
        VendorWatchlist w = new VendorWatchlist();
        w.setVendorId(1L);
        FishSpecies s = new FishSpecies();
        s.setId(speciesId);
        w.setSpecies(s);
        return w;
    }

    private VendorWatchlist watchlistWithLocation(MarketLocation loc, BigDecimal radius) {
        VendorWatchlist w = new VendorWatchlist();
        w.setVendorId(1L);
        w.setMarketLocation(loc);
        w.setRadiusKm(radius);
        return w;
    }

    private MarketLocation location(double lat, double lng) {
        MarketLocation m = new MarketLocation();
        m.setId(1L);
        m.setLat(BigDecimal.valueOf(lat));
        m.setLng(BigDecimal.valueOf(lng));
        return m;
    }
}

package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.MarketLocation;
import com.mermaid.app.domain.User;
import com.mermaid.app.mapper.DemandListingMapper;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.model.OfferLookupItem;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketplaceServiceTest {

    @Mock DemandListingRepository listingRepo;
    @Mock DemandListingMapper mapper;
    @Mock UserRepository userRepo;
    @InjectMocks MarketplaceService service;

    // --- browseListings ---

    @Test
    void browseListings_noFilters_returnsAll() {
        DemandListing entity = openListing(1L, 10L);
        when(listingRepo.findOpenListings(DemandListingStatus.OPEN, null, null, null, null))
                .thenReturn(List.of(entity));
        when(userRepo.findAllById(List.of(10L)))
                .thenReturn(List.of(userWithName(10L, "Rosario")));
        when(mapper.toModel(entity, "Rosario")).thenReturn(modelListing(1L));

        List<com.mermaid.app.model.DemandListing> result =
                service.browseListings(null, null, null, null);

        assertEquals(1, result.size());
        verify(listingRepo).findOpenListings(DemandListingStatus.OPEN, null, null, null, null);
    }

    @Test
    void browseListings_withPriceFilter_passesBigDecimal() {
        when(listingRepo.findOpenListings(
                DemandListingStatus.OPEN, null, null, BigDecimal.valueOf(100.0), null))
                .thenReturn(List.of());
        when(userRepo.findAllById(List.of())).thenReturn(List.of());

        List<com.mermaid.app.model.DemandListing> result =
                service.browseListings(null, null, 100.0, null);

        assertEquals(0, result.size());
        verify(listingRepo).findOpenListings(
                DemandListingStatus.OPEN, null, null, BigDecimal.valueOf(100.0), null);
    }

    @Test
    void browseListings_multipleVendors_batchesUserLookup() {
        DemandListing entity1 = openListing(1L, 10L);
        DemandListing entity2 = openListing(2L, 20L);
        when(listingRepo.findOpenListings(DemandListingStatus.OPEN, null, null, null, null))
                .thenReturn(List.of(entity1, entity2));

        User user1 = userWithName(10L, "Rosario");
        User user2 = userWithName(20L, "Pedro");
        // The service collects distinct vendor IDs in encounter order, so we match any list
        // containing both IDs — we care only that findAllById is called exactly once.
        when(userRepo.findAllById(argThat(ids -> {
            List<Long> asList = new java.util.ArrayList<>();
            ids.forEach(asList::add);
            return asList.containsAll(List.of(10L, 20L));
        }))).thenReturn(List.of(user1, user2));

        when(mapper.toModel(entity1, "Rosario")).thenReturn(modelListing(1L));
        when(mapper.toModel(entity2, "Pedro")).thenReturn(modelListing(2L));

        List<com.mermaid.app.model.DemandListing> result =
                service.browseListings(null, null, null, null);

        assertEquals(2, result.size());
        // batch: userRepo must be called exactly once regardless of number of vendors
        verify(userRepo, times(1)).findAllById(any());
    }

    // --- lookupOffers ---

    @Test
    void lookupOffers_bySpecies_returnsItems() {
        DemandListing entity = openListing(1L, 10L);
        when(listingRepo.findOpenOffersBySpecies(DemandListingStatus.OPEN, 2L, null))
                .thenReturn(List.of(entity));
        when(userRepo.findAllById(List.of(10L)))
                .thenReturn(List.of(userWithName(10L, "Rosario")));
        when(mapper.toOfferLookupItem(entity, "Rosario")).thenReturn(sampleOfferLookupItem());

        List<OfferLookupItem> result = service.lookupOffers(2L, null);

        assertEquals(1, result.size());
        verify(listingRepo).findOpenOffersBySpecies(DemandListingStatus.OPEN, 2L, null);
    }

    @Test
    void lookupOffers_nullSpeciesId_throwsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> service.lookupOffers(null, null));
    }

    @Test
    void lookupOffers_emptyResult_returnsEmptyList() {
        when(listingRepo.findOpenOffersBySpecies(DemandListingStatus.OPEN, 99L, null))
                .thenReturn(List.of());
        // batchVendorNames always calls findAllById, even with an empty id list
        when(userRepo.findAllById(List.of())).thenReturn(List.of());

        List<OfferLookupItem> result = service.lookupOffers(99L, null);

        assertTrue(result.isEmpty());
    }

    // --- helpers ---

    private DemandListing openListing(Long id, Long vendorId) {
        DemandListing e = new DemandListing();
        e.setId(id);
        e.setVendorId(vendorId);
        e.setSpecies(speciesEntity(2L));
        e.setLocation(locationEntity(3L));
        e.setQuantityKg(new BigDecimal("5.00"));
        e.setOfferPricePerKg(new BigDecimal("150.00"));
        e.setStatus(DemandListingStatus.OPEN);
        e.setPostedAt(OffsetDateTime.now());
        return e;
    }

    private FishSpecies speciesEntity(Long id) {
        FishSpecies s = new FishSpecies();
        s.setId(id);
        s.setCommonName("Bangus");
        return s;
    }

    private MarketLocation locationEntity(Long id) {
        MarketLocation l = new MarketLocation();
        l.setId(id);
        l.setName("Carbon Market");
        l.setMunicipality("Cebu City");
        return l;
    }

    private User userWithName(Long id, String name) {
        User u = new User();
        u.setId(id);
        u.setFullName(name);
        return u;
    }

    private com.mermaid.app.model.DemandListing modelListing(Long id) {
        return new com.mermaid.app.model.DemandListing(
                id, 10L,
                new com.mermaid.app.model.FishSpecies(2L, "Bangus", true),
                new com.mermaid.app.model.MarketLocation(3L, "Carbon Market", "Cebu City", true),
                5.0, 150.0, DemandListingStatus.OPEN, OffsetDateTime.now());
    }

    private OfferLookupItem sampleOfferLookupItem() {
        return new OfferLookupItem(
                1L, 10L, "Rosario",
                new com.mermaid.app.model.MarketLocation(3L, "Carbon Market", "Cebu City", true),
                150.0, 5.0);
    }
}

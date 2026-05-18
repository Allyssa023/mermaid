package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StorefrontListingServiceTest {

    @Mock StorefrontListingRepository listingRepo;
    @Mock StorefrontListingLotRepository listingLotRepo;
    @Mock InventoryLotRepository lotRepo;
    @Mock InventoryService inventoryService;
    @InjectMocks StorefrontListingService service;

    // ---- create ----

    @Test
    void create_savesListingAsPublishedWithLotLinks() {
        InventoryLot lot = lot(1L, 10L, 5L, bd("20.00"));
        when(lotRepo.findById(1L)).thenReturn(Optional.of(lot));

        StorefrontListing draft = listingWithFreshness(null, null, 5L);
        StorefrontListing saved = listingWithFreshness(100L, 10L, 5L);
        when(listingRepo.save(any())).thenReturn(saved);
        when(listingLotRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        StorefrontListing result = service.create(10L, draft, List.of(1L));

        assertThat(result.getId()).isEqualTo(100L);
        verify(listingRepo).save(argThat(l -> l.getStatus() == StorefrontListingStatus.PUBLISHED
                && Long.valueOf(10L).equals(l.getVendorId())));
        verify(listingLotRepo).save(any(StorefrontListingLot.class));
    }

    @Test
    void create_missingFreshnessPhotos_throws() {
        InventoryLot lot = lot(1L, 10L, 5L, bd("20.00"));
        when(lotRepo.findById(1L)).thenReturn(Optional.of(lot));

        StorefrontListing draft = listing(null, null, 5L); // no freshness photos
        assertThatThrownBy(() -> service.create(10L, draft, List.of(1L)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("freshness photos");
    }

    @Test
    void create_allFreshnessPhotosProvided_publishesDirectly() {
        InventoryLot lot = lot(1L, 10L, 5L, bd("20.00"));
        when(lotRepo.findById(1L)).thenReturn(Optional.of(lot));

        StorefrontListing draft = listingWithFreshness(null, null, 5L);
        StorefrontListing saved = listingWithFreshness(100L, 10L, 5L);
        when(listingRepo.save(any())).thenReturn(saved);
        when(listingLotRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        StorefrontListing result = service.create(10L, draft, List.of(1L));

        assertThat(result.getId()).isEqualTo(100L);
        verify(listingRepo).save(argThat(l -> l.getStatus() == StorefrontListingStatus.PUBLISHED
                && Long.valueOf(10L).equals(l.getVendorId())));
    }

    @Test
    void create_otherVendorsLot_throws() {
        InventoryLot lot = lot(1L, 99L, 5L, bd("20.00")); // vendorId 99, not 10
        when(lotRepo.findById(1L)).thenReturn(Optional.of(lot));

        assertThatThrownBy(() ->
                service.create(10L, listing(null, null, 5L), List.of(1L)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("belong to vendor");
    }

    @Test
    void create_speciesMismatch_throws() {
        InventoryLot lot = lot(1L, 10L, 99L, bd("20.00")); // speciesId 99, not 5
        when(lotRepo.findById(1L)).thenReturn(Optional.of(lot));

        assertThatThrownBy(() ->
                service.create(10L, listing(null, null, 5L), List.of(1L)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("species mismatch");
    }

    @Test
    void create_lotAlreadyInActiveListing_throws() {
        InventoryLot lot = lot(1L, 10L, 5L, bd("20.00"));
        when(lotRepo.findById(1L)).thenReturn(Optional.of(lot));
        when(listingLotRepo.existsByLotIdInActiveListing(1L)).thenReturn(true);

        assertThatThrownBy(() ->
                service.create(10L, listing(null, null, 5L), List.of(1L)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already assigned");
        verify(listingLotRepo, never()).save(any());
    }

    @Test
    void create_lotAlreadyInADifferentListing_throws() {
        // Same lot used in create — should still throw even with excludeListingId=null
        InventoryLot lot = lot(1L, 10L, 5L, bd("20.00"));
        when(lotRepo.findById(1L)).thenReturn(Optional.of(lot));
        when(listingLotRepo.existsByLotIdInActiveListing(1L)).thenReturn(true);

        assertThatThrownBy(() ->
                service.create(10L, listing(null, null, 5L), List.of(1L)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already assigned");
    }

    // ---- publish ----

    @Test
    void publish_withAvailableStock_setsStatusPublished() {
        StorefrontListing sl = ownedListing(10L, 5L);
        sl.setPhotoEyes("http://example.com/eyes.jpg");
        sl.setPhotoGills("http://example.com/gills.jpg");
        sl.setPhotoScales("http://example.com/scales.jpg");
        sl.setPhotoBelly("http://example.com/belly.jpg");
        sl.setPhotoFlesh("http://example.com/flesh.jpg");
        when(listingRepo.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sl));
        when(inventoryService.availableKg(10L, 5L)).thenReturn(bd("15.00"));

        InventoryLot lot = lot(1L, 10L, 5L, bd("15.00"));
        when(listingLotRepo.findByIdListingId(1L)).thenReturn(List.of(new StorefrontListingLot(1L, 1L)));
        when(lotRepo.findById(1L)).thenReturn(Optional.of(lot));
        when(listingRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        StorefrontListing result = service.publish(10L, 1L);

        assertThat(result.getStatus()).isEqualTo(StorefrontListingStatus.PUBLISHED);
    }

    @Test
    void publish_zeroAvailableKg_throws() {
        StorefrontListing sl = ownedListing(10L, 5L);
        when(listingRepo.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sl));
        when(inventoryService.availableKg(10L, 5L)).thenReturn(BigDecimal.ZERO);

        assertThatThrownBy(() -> service.publish(10L, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("zero available stock");
    }

    @Test
    void publish_noLotsWithStock_throws() {
        StorefrontListing sl = ownedListing(10L, 5L);
        when(listingRepo.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sl));
        when(inventoryService.availableKg(10L, 5L)).thenReturn(bd("10.00"));

        InventoryLot emptyLot = lot(1L, 10L, 5L, BigDecimal.ZERO);
        when(listingLotRepo.findByIdListingId(1L)).thenReturn(List.of(new StorefrontListingLot(1L, 1L)));
        when(lotRepo.findById(1L)).thenReturn(Optional.of(emptyLot));

        assertThatThrownBy(() -> service.publish(10L, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no lots with remaining stock");
    }

    // ---- vendor scoping ----

    @Test
    void publish_wrongVendor_throws() {
        StorefrontListing sl = ownedListing(99L, 5L); // owned by vendor 99
        when(listingRepo.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sl));

        assertThatThrownBy(() -> service.publish(10L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- soft delete ----

    @Test
    void delete_softDeletesAndExcludesFromList() {
        StorefrontListing sl = ownedListing(10L, 5L);
        when(listingRepo.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sl));
        when(listingRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.delete(10L, 1L);

        verify(listingRepo).save(argThat(l -> l.isDeleted()));
    }

    @Test
    void listForVendor_excludesDeleted() {
        StorefrontListing sl = ownedListing(10L, 5L);
        when(listingRepo.findByVendorIdAndIsDeletedFalse(10L)).thenReturn(List.of(sl));

        List<StorefrontListing> result = service.listForVendor(10L);

        assertThat(result).hasSize(1);
        verify(listingRepo).findByVendorIdAndIsDeletedFalse(10L);
    }

    // ---- incrementViewCount ----

    @Test
    void incrementViewCount_incrementsMonotonically() {
        StorefrontListing listing = new StorefrontListing();
        listing.setId(1L);
        listing.setViewCount(5);
        when(listingRepo.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(listing));
        when(listingRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.incrementViewCount(1L);

        ArgumentCaptor<StorefrontListing> cap = ArgumentCaptor.forClass(StorefrontListing.class);
        verify(listingRepo).save(cap.capture());
        assertThat(cap.getValue().getViewCount()).isEqualTo(6);
    }

    @Test
    void incrementViewCount_silentlyIgnoresMissingId() {
        when(listingRepo.findByIdAndIsDeletedFalse(99L)).thenReturn(Optional.empty());
        assertDoesNotThrow(() -> service.incrementViewCount(99L));
        verify(listingRepo, never()).save(any());
    }

    // ---- helpers ----

    private static BigDecimal bd(String v) { return new BigDecimal(v); }

    private static InventoryLot lot(Long id, Long vendorId, Long speciesId, BigDecimal remaining) {
        InventoryLot l = new InventoryLot();
        l.setId(id);
        l.setVendorId(vendorId);
        l.setSpeciesId(speciesId);
        l.setInitialKg(remaining);
        l.setRemainingKg(remaining);
        return l;
    }

    private static StorefrontListing listing(Long id, Long vendorId, Long speciesId) {
        StorefrontListing l = new StorefrontListing();
        l.setId(id);
        l.setVendorId(vendorId);
        l.setSpeciesId(speciesId);
        l.setTitle("Test listing");
        l.setPricePerKg(bd("200.00"));
        l.setMinQtyKg(bd("0.5"));
        l.setStatus(StorefrontListingStatus.DRAFT);
        return l;
    }

    private StorefrontListing ownedListing(Long vendorId, Long speciesId) {
        StorefrontListing l = listing(1L, vendorId, speciesId);
        l.setStatus(StorefrontListingStatus.DRAFT);
        return l;
    }

    private static StorefrontListing listingWithFreshness(Long id, Long vendorId, Long speciesId) {
        StorefrontListing l = listing(id, vendorId, speciesId);
        l.setPhotoEyes("http://example.com/eyes.jpg");
        l.setPhotoGills("http://example.com/gills.jpg");
        l.setPhotoScales("http://example.com/scales.jpg");
        l.setPhotoBelly("http://example.com/belly.jpg");
        l.setPhotoFlesh("http://example.com/flesh.jpg");
        return l;
    }
}

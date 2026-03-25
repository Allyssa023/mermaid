package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.MarketLocation;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.DemandListingMapper;
import com.mermaid.app.model.DemandListingCreateRequest;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.model.DemandListingUpdateRequest;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.MarketLocationRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DemandListingServiceTest {

    @Mock DemandListingRepository repo;
    @Mock DemandListingMapper mapper;
    @Mock FishSpeciesRepository speciesRepo;
    @Mock MarketLocationRepository locationRepo;
    @Mock UserRepository userRepo;
    @InjectMocks DemandListingService service;

    // --- listOwn ---

    @Test
    void listOwn_noFilter_returnsAllNonDeleted() {
        DemandListing e = openListing(1L, 10L);
        when(repo.findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(10L))
            .thenReturn(List.of(e));
        when(userRepo.findById(10L)).thenReturn(Optional.empty());
        when(mapper.toModel(e, null)).thenReturn(modelListing(1L));

        List<com.mermaid.app.model.DemandListing> result = service.listOwn(10L, null);

        assertEquals(1, result.size());
        verify(repo).findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(10L);
        verify(repo, never()).findAllByVendorIdAndStatusAndIsDeletedFalseOrderByPostedAtDescIdDesc(any(), any());
    }

    @Test
    void listOwn_withStatusFilter_delegatesFilteredQuery() {
        DemandListing e = openListing(1L, 10L);
        when(repo.findAllByVendorIdAndStatusAndIsDeletedFalseOrderByPostedAtDescIdDesc(
                10L, DemandListingStatus.OPEN))
            .thenReturn(List.of(e));
        when(userRepo.findById(10L)).thenReturn(Optional.empty());
        when(mapper.toModel(e, null)).thenReturn(modelListing(1L));

        List<com.mermaid.app.model.DemandListing> result = service.listOwn(10L, DemandListingStatus.OPEN);

        assertEquals(1, result.size());
        verify(repo, never()).findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(any());
    }

    @Test
    void listOwn_vendorNameNull_mapsToNullVendorName() {
        DemandListing e = openListing(1L, 10L);
        when(repo.findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(10L))
            .thenReturn(List.of(e));
        when(userRepo.findById(10L)).thenReturn(Optional.empty());
        when(mapper.toModel(e, null)).thenReturn(modelListing(1L));

        // must not throw — null vendorName is valid
        assertDoesNotThrow(() -> service.listOwn(10L, null));
        verify(mapper).toModel(e, null);
    }

    // --- create ---

    @Test
    void create_validRequest_savesAndReturnsModel() {
        FishSpecies species = speciesEntity(2L);
        MarketLocation location = locationEntity(3L);
        when(speciesRepo.findById(2L)).thenReturn(Optional.of(species));
        when(locationRepo.findById(3L)).thenReturn(Optional.of(location));
        DemandListing saved = openListing(1L, 42L);
        when(repo.save(any())).thenReturn(saved);
        when(userRepo.findById(42L)).thenReturn(Optional.empty());
        when(mapper.toModel(saved, null)).thenReturn(modelListing(1L));

        com.mermaid.app.model.DemandListing result =
            service.create(createRequest(2L, 3L), 42L);

        assertNotNull(result);
        verify(repo).save(any());
    }

    @Test
    void create_withOptionalFields_savesNotesAndNeededBy() {
        FishSpecies species = speciesEntity(2L);
        MarketLocation location = locationEntity(3L);
        when(speciesRepo.findById(2L)).thenReturn(Optional.of(species));
        when(locationRepo.findById(3L)).thenReturn(Optional.of(location));
        DemandListing saved = openListing(1L, 42L);
        when(repo.save(any())).thenReturn(saved);
        when(userRepo.findById(42L)).thenReturn(Optional.empty());
        when(mapper.toModel(saved, null)).thenReturn(modelListing(1L));

        DemandListingCreateRequest req = new DemandListingCreateRequest(2L, 3L, 5.0, 150.0);
        req.setNotes(org.openapitools.jackson.nullable.JsonNullable.of("fresh catch preferred"));

        assertDoesNotThrow(() -> service.create(req, 42L));
        verify(repo).save(argThat(e -> "fresh catch preferred".equals(e.getNotes())));
    }

    @Test
    void create_speciesNotFound_throwsResourceNotFoundException() {
        when(speciesRepo.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> service.create(createRequest(99L, 3L), 1L));
        verify(repo, never()).save(any());
    }

    @Test
    void create_locationNotFound_throwsResourceNotFoundException() {
        when(speciesRepo.findById(2L)).thenReturn(Optional.of(speciesEntity(2L)));
        when(locationRepo.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> service.create(createRequest(2L, 99L), 1L));
        verify(repo, never()).save(any());
    }

    // --- update ---

    @Test
    void update_openListing_appliesNonNullFieldsOnly() {
        DemandListing entity = openListing(1L, 10L);
        entity.setQuantityKg(new BigDecimal("5.00"));
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));
        when(repo.save(entity)).thenReturn(entity);
        when(userRepo.findById(10L)).thenReturn(Optional.empty());
        when(mapper.toModel(entity, null)).thenReturn(modelListing(1L));

        DemandListingUpdateRequest req = new DemandListingUpdateRequest();
        req.setQuantityKg(10.0);
        // speciesId intentionally not set — must not throw

        service.update(1L, 10L, req);

        assertEquals(new BigDecimal("10.0"), entity.getQuantityKg());
        verify(speciesRepo, never()).findById(any());
    }

    @Test
    void update_newSpeciesNotFound_throwsResourceNotFoundException() {
        DemandListing entity = openListing(1L, 10L);
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));
        when(speciesRepo.findById(99L)).thenReturn(Optional.empty());

        DemandListingUpdateRequest req = new DemandListingUpdateRequest();
        req.setSpeciesId(99L);

        assertThrows(ResourceNotFoundException.class, () -> service.update(1L, 10L, req));
        verify(repo, never()).save(any());
    }

    @Test
    void update_newLocationNotFound_throwsResourceNotFoundException() {
        DemandListing entity = openListing(1L, 10L);
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));
        when(locationRepo.findById(99L)).thenReturn(Optional.empty());

        DemandListingUpdateRequest req = new DemandListingUpdateRequest();
        req.setLocationId(99L);

        assertThrows(ResourceNotFoundException.class, () -> service.update(1L, 10L, req));
        verify(repo, never()).save(any());
    }

    @Test
    void update_closedListing_throwsListingClosedException() {
        DemandListing entity = openListing(1L, 10L);
        entity.setStatus(DemandListingStatus.CLOSED);
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));

        assertThrows(ListingClosedException.class,
            () -> service.update(1L, 10L, new DemandListingUpdateRequest()));
        verify(repo, never()).save(any());
    }

    @Test
    void update_notOwned_throwsResourceNotFoundException() {
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> service.update(1L, 10L, new DemandListingUpdateRequest()));
    }

    // --- delete ---

    @Test
    void delete_softDeletesRow_neverCallsDeleteById() {
        DemandListing entity = openListing(1L, 10L);
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));

        service.delete(1L, 10L);

        assertTrue(entity.isDeleted());
        verify(repo).save(entity);
        verify(repo, never()).deleteById(any());
        verify(repo, never()).delete(any());
    }

    @Test
    void delete_closedListing_softDeletesSuccessfully() {
        DemandListing entity = openListing(1L, 10L);
        entity.setStatus(DemandListingStatus.CLOSED);
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));

        // should NOT throw — CLOSED listings can be deleted
        assertDoesNotThrow(() -> service.delete(1L, 10L));
        assertTrue(entity.isDeleted());
    }

    @Test
    void delete_alreadySoftDeleted_throwsResourceNotFoundException() {
        // repo filters is_deleted=false, so already-deleted listings return empty
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.delete(1L, 10L));
    }

    @Test
    void getById_found_returnsModel() {
        DemandListing entity = openListing(1L, 10L);
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));
        when(userRepo.findById(10L)).thenReturn(Optional.empty());
        when(mapper.toModel(entity, null)).thenReturn(modelListing(1L));

        com.mermaid.app.model.DemandListing result = service.getById(1L, 10L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
    }

    @Test
    void getById_softDeleted_throwsResourceNotFoundException() {
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getById(1L, 10L));
    }

    // --- close ---

    @Test
    void close_openListing_setsStatusClosed() {
        DemandListing entity = openListing(1L, 10L);
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));
        when(repo.save(entity)).thenReturn(entity);
        when(userRepo.findById(10L)).thenReturn(Optional.empty());
        when(mapper.toModel(entity, null)).thenReturn(modelListing(1L));

        service.close(1L, 10L);

        assertEquals(DemandListingStatus.CLOSED, entity.getStatus());
        verify(repo).save(entity);
    }

    @Test
    void close_alreadyClosed_isIdempotent() {
        DemandListing entity = openListing(1L, 10L);
        entity.setStatus(DemandListingStatus.CLOSED);
        when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));
        when(userRepo.findById(10L)).thenReturn(Optional.empty());
        when(mapper.toModel(entity, null)).thenReturn(modelListing(1L));

        service.close(1L, 10L);

        // no save call — avoids spurious updated_at bump
        verify(repo, never()).save(any());
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

    private DemandListingCreateRequest createRequest(Long speciesId, Long locationId) {
        return new DemandListingCreateRequest(speciesId, locationId, 5.0, 150.0);
    }

    private com.mermaid.app.model.DemandListing modelListing(Long id) {
        return new com.mermaid.app.model.DemandListing(
            id, 10L,
            new com.mermaid.app.model.FishSpecies(2L, "Bangus", true),
            new com.mermaid.app.model.MarketLocation(3L, "Carbon Market", "Cebu City", true),
            5.0, 150.0, DemandListingStatus.OPEN, OffsetDateTime.now());
    }
}

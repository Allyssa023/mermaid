package com.mermaid.app.service;

import com.mermaid.app.domain.CatchLog;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.Trip;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.mapper.CatchLogMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.CatchLogRepository;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.TripRepository;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatchLogServiceTest {

    @Mock CatchLogRepository catchLogRepo;
    @Mock TripRepository tripRepo;
    @Mock CatchLogMapper catchLogMapper;
    @Mock FishSpeciesRepository speciesRepo;
    @Mock DemandListingRepository listingRepo;
    @InjectMocks CatchLogService catchLogService;

    // --- listByTrip ---

    @Test
    void listByTrip_notOwnedTrip_throwsResourceNotFoundException() {
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.listByTrip(1L, 42L));
    }

    @Test
    void listByTrip_completedTrip_returnsResults() {
        // ACTIVE guard NOT applied for reads — completed trips are readable
        Trip completedTrip = tripEntity(1L, 42L, TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(completedTrip));
        when(catchLogRepo.findAllByTripIdOrderByLoggedAtDesc(1L)).thenReturn(List.of());

        assertDoesNotThrow(() -> catchLogService.listByTrip(1L, 42L));
    }

    // --- create ---

    @Test
    void create_activeTrip_savesAndReturnsMappedModel() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        FishSpecies species = speciesEntity(3L);
        CatchLog saved = catchLogEntity(10L, 1L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(speciesRepo.findById(3L)).thenReturn(Optional.of(species));
        when(catchLogRepo.save(any())).thenReturn(saved);
        when(catchLogMapper.toModel(saved)).thenReturn(new com.mermaid.app.model.CatchLog());

        CatchLogCreateRequest req = new CatchLogCreateRequest(3L, "5.0", 10.0, 250.0);
        assertDoesNotThrow(() -> catchLogService.create(1L, req, 42L));
        verify(catchLogRepo).save(any());
    }

    @Test
    void create_speciesNotFound_throwsResourceNotFoundException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(speciesRepo.findById(99L)).thenReturn(Optional.empty());

<<<<<<< Updated upstream
        CatchLogCreateRequest req = new CatchLogCreateRequest(99L, "5.0", 5.0, 100.0);
=======
        CatchLogCreateRequest req = new CatchLogCreateRequest(99L, "5.0", 10.0, 250.0);
>>>>>>> Stashed changes
        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.create(1L, req, 42L));
    }

    @Test
    void create_invalidMatchedListingId_throwsResourceNotFoundException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        FishSpecies species = speciesEntity(3L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(speciesRepo.findById(3L)).thenReturn(Optional.of(species));
        when(listingRepo.findById(999L)).thenReturn(Optional.empty());

        CatchLogCreateRequest req = new CatchLogCreateRequest(3L, "5.0", 10.0, 250.0);
        req.setMatchedListingId(
            org.openapitools.jackson.nullable.JsonNullable.of(999L));
        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.create(1L, req, 42L));
    }

    @Test
    void create_nullMatchedListingId_skipsListingValidation() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        FishSpecies species = speciesEntity(3L);
        CatchLog saved = catchLogEntity(10L, 1L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(speciesRepo.findById(3L)).thenReturn(Optional.of(species));
        when(catchLogRepo.save(any())).thenReturn(saved);
        when(catchLogMapper.toModel(saved)).thenReturn(new com.mermaid.app.model.CatchLog());

        CatchLogCreateRequest req = new CatchLogCreateRequest(3L, "5.0", 10.0, 250.0);
        // matchedListingId left as undefined/null — validation must not be attempted
        catchLogService.create(1L, req, 42L);

        verify(listingRepo, never()).findById(any());
    }

    @Test
    void create_completedTrip_throwsTripNotActiveException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        assertThrows(TripNotActiveException.class,
            () -> catchLogService.create(1L, new CatchLogCreateRequest(3L, "5.0", 10.0, 250.0), 42L));
    }

    // --- update ---

    @Test
    void update_nonNullFieldsOnly_applied() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        CatchLog catchLog = catchLogEntity(10L, 1L);
        catchLog.setNotes("original");
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(10L, 1L)).thenReturn(Optional.of(catchLog));
        when(catchLogRepo.save(any())).thenReturn(catchLog);
        when(catchLogMapper.toModel(catchLog)).thenReturn(new com.mermaid.app.model.CatchLog());

        CatchLogUpdateRequest req = new CatchLogUpdateRequest();
        // notes field left null — must not overwrite existing value
        catchLogService.update(1L, 10L, req, 42L);

        verify(catchLogRepo).save(argThat(c -> "original".equals(c.getNotes())));
    }

    @Test
    void update_nullMatchedListingId_clearsField() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        CatchLog catchLog = catchLogEntity(10L, 1L);
        catchLog.setMatchedListingId(5L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(10L, 1L)).thenReturn(Optional.of(catchLog));
        when(catchLogRepo.save(any())).thenReturn(catchLog);
        when(catchLogMapper.toModel(catchLog)).thenReturn(new com.mermaid.app.model.CatchLog());

        CatchLogUpdateRequest req = new CatchLogUpdateRequest();
        req.setMatchedListingId(
            org.openapitools.jackson.nullable.JsonNullable.of(null)); // explicit null = clear
        catchLogService.update(1L, 10L, req, 42L);

        verify(catchLogRepo).save(argThat(c -> c.getMatchedListingId() == null));
        verify(listingRepo, never()).findById(any());
    }

    @Test
    void update_newSpeciesNotFound_throwsResourceNotFoundException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        CatchLog catchLog = catchLogEntity(10L, 1L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(10L, 1L)).thenReturn(Optional.of(catchLog));
        when(speciesRepo.findById(99L)).thenReturn(Optional.empty());

        CatchLogUpdateRequest req = new CatchLogUpdateRequest();
        req.setSpeciesId(99L);
        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.update(1L, 10L, req, 42L));
    }

    @Test
    void update_catchNotInTrip_throwsResourceNotFoundException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.update(1L, 99L, new CatchLogUpdateRequest(), 42L));
    }

    @Test
    void update_completedTrip_throwsTripNotActiveException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        assertThrows(TripNotActiveException.class,
            () -> catchLogService.update(1L, 10L, new CatchLogUpdateRequest(), 42L));
    }

    // --- delete ---

    @Test
    void delete_activeTrip_callsDeleteById() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        CatchLog catchLog = catchLogEntity(10L, 1L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(10L, 1L)).thenReturn(Optional.of(catchLog));

        catchLogService.delete(1L, 10L, 42L);

        verify(catchLogRepo).deleteById(10L);
        verify(catchLogRepo, never()).save(any());
    }

    @Test
    void delete_completedTrip_throwsTripNotActiveException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        assertThrows(TripNotActiveException.class,
            () -> catchLogService.delete(1L, 10L, 42L));
    }

    @Test
    void delete_catchNotInTrip_throwsResourceNotFoundException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.delete(1L, 99L, 42L));
    }

    // --- helpers ---

    private Trip tripEntity(Long id, Long fishermanId, TripStatus status) {
        Trip t = new Trip();
        t.setId(id);
        t.setFishermanId(fishermanId);
        t.setStatus(status);
        t.setDeparturePoint("Navotas Port");
        t.setTargetArea("Manila Bay");
        t.setStartedAt(OffsetDateTime.now());
        return t;
    }

    private FishSpecies speciesEntity(Long id) {
        FishSpecies s = new FishSpecies();
        s.setId(id);
        s.setCommonName("Bangus");
        s.setActive(true);
        return s;
    }

    private CatchLog catchLogEntity(Long id, Long tripId) {
        CatchLog c = new CatchLog();
        c.setId(id);
        c.setTripId(tripId);
        c.setQuantityKg(new BigDecimal("5.0"));
        c.setLoggedAt(OffsetDateTime.now());
        FishSpecies s = speciesEntity(3L);
        c.setSpecies(s);
        return c;
    }
}

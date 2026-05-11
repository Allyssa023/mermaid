package com.mermaid.app.service;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.mapper.TripMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.TripRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripServiceTest {

    @Mock TripRepository tripRepo;
    @Mock TripMapper tripMapper;
    @Mock UserRepository userRepo;
    @InjectMocks TripService tripService;

    // --- listTrips ---

    @Test
    void listTrips_noFilter_callsUnfilteredQuery() {
        when(tripRepo.findAllByFishermanIdOrderByStartedAtDescIdDesc(42L)).thenReturn(List.of());
        when(userRepo.findById(42L)).thenReturn(Optional.empty());

        tripService.listTrips(null, 42L);

        verify(tripRepo).findAllByFishermanIdOrderByStartedAtDescIdDesc(42L);
        verify(tripRepo, never()).findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(any(), any());
    }

    @Test
    void listTrips_withStatusFilter_callsFilteredQuery() {
        when(tripRepo.findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(42L, TripStatus.ACTIVE))
            .thenReturn(List.of());
        when(userRepo.findById(42L)).thenReturn(Optional.empty());

        tripService.listTrips(TripStatus.ACTIVE, 42L);

        verify(tripRepo).findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(42L, TripStatus.ACTIVE);
        verify(tripRepo, never()).findAllByFishermanIdOrderByStartedAtDescIdDesc(any());
    }

    // --- startTrip ---

    @Test
    void startTrip_setsCorrectFishermanIdAndActiveStatus() {
        Trip savedTrip = activeTrip(1L, 42L);
        when(tripRepo.save(any(Trip.class))).thenReturn(savedTrip);
        when(userRepo.findById(42L)).thenReturn(Optional.empty());
        when(tripMapper.toModel(savedTrip, null)).thenReturn(new com.mermaid.app.model.Trip());

        TripStartRequest req = new TripStartRequest();
        req.setDeparturePoint(org.openapitools.jackson.nullable.JsonNullable.of("Navotas Port"));
        req.setTargetArea(org.openapitools.jackson.nullable.JsonNullable.of("Manila Bay"));
        tripService.startTrip(req, 42L);

        ArgumentCaptor<Trip> captor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepo).save(captor.capture());
        assertEquals(42L, captor.getValue().getFishermanId());
        assertEquals(TripStatus.ACTIVE, captor.getValue().getStatus());
    }

    // --- getTripById ---

    @Test
    void getTripById_notOwned_throwsResourceNotFoundException() {
        when(tripRepo.findByIdAndFishermanId(99L, 42L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> tripService.getTripById(99L, 42L));
    }

    // --- saveTripChecklist ---

    @Test
    void saveTripChecklist_activeTrip_savesAllSixBooleans() {
        Trip trip = activeTrip(1L, 42L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(tripRepo.save(any())).thenReturn(trip);

        SafetyChecklistRequest req = new SafetyChecklistRequest(true, true, false, true, true, false);
        tripService.saveTripChecklist(1L, req, 42L);

        ArgumentCaptor<Trip> captor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepo).save(captor.capture());
        Trip saved = captor.getValue();
        assertTrue(saved.getFuelChecked());
        assertFalse(saved.getRadioChecked());
        assertNotNull(saved.getChecklistCompletedAt());
    }

    @Test
    void saveTripChecklist_completedTrip_throwsTripNotActiveException() {
        Trip trip = activeTrip(1L, 42L);
        trip.setStatus(TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        SafetyChecklistRequest req = new SafetyChecklistRequest(true, true, true, true, true, true);
        assertThrows(TripNotActiveException.class,
            () -> tripService.saveTripChecklist(1L, req, 42L));
    }

    @Test
    void saveTripChecklist_cancelledTrip_throwsTripNotActiveException() {
        Trip trip = activeTrip(1L, 42L);
        trip.setStatus(TripStatus.CANCELLED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        SafetyChecklistRequest req = new SafetyChecklistRequest(true, true, true, true, true, true);
        assertThrows(TripNotActiveException.class,
            () -> tripService.saveTripChecklist(1L, req, 42L));
    }

    // --- endTrip ---

    @Test
    void endTrip_activeTrip_setsCompletedAndEndedAt() {
        Trip trip = activeTrip(1L, 42L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(tripRepo.save(any())).thenReturn(trip);
        when(userRepo.findById(42L)).thenReturn(Optional.empty());
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        tripService.endTrip(1L, new TripEndRequest(), 42L);

        ArgumentCaptor<Trip> captor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepo).save(captor.capture());
        assertEquals(TripStatus.COMPLETED, captor.getValue().getStatus());
        assertNotNull(captor.getValue().getEndedAt());
    }

    @Test
    void endTrip_alreadyCompleted_throwsTripNotActiveException() {
        Trip trip = activeTrip(1L, 42L);
        trip.setStatus(TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        assertThrows(TripNotActiveException.class,
            () -> tripService.endTrip(1L, new TripEndRequest(), 42L));
    }

    @Test
    void endTrip_nullNotes_doesNotOverwriteExistingNotes() {
        Trip trip = activeTrip(1L, 42L);
        trip.setNotes("original note");
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(tripRepo.save(any())).thenReturn(trip);
        when(userRepo.findById(42L)).thenReturn(Optional.empty());
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        TripEndRequest req = new TripEndRequest(); // notes field is null/undefined
        tripService.endTrip(1L, req, 42L);

        ArgumentCaptor<Trip> captor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepo).save(captor.capture());
        assertEquals("original note", captor.getValue().getNotes());
    }

    // --- helpers ---

    private Trip activeTrip(Long id, Long fishermanId) {
        Trip t = new Trip();
        t.setId(id);
        t.setFishermanId(fishermanId);
        t.setStatus(TripStatus.ACTIVE);
        t.setDeparturePoint("Navotas Port");
        t.setTargetArea("Manila Bay");
        t.setStartedAt(OffsetDateTime.now());
        return t;
    }
}

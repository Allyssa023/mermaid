package com.mermaid.app.service;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.mapper.TripMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.TripRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class TripService {

    private final TripRepository tripRepo;
    private final TripMapper tripMapper;
    private final UserRepository userRepo;

    public TripService(TripRepository tripRepo, TripMapper tripMapper, UserRepository userRepo) {
        this.tripRepo = tripRepo;
        this.tripMapper = tripMapper;
        this.userRepo = userRepo;
    }

    private String resolveFishermanName(Long fishermanId) {
        return userRepo.findById(fishermanId).map(u -> u.getFullName()).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.Trip> listTrips(TripStatus statusFilter, Long fishermanId) {
        List<Trip> entities = statusFilter == null
            ? tripRepo.findAllByFishermanIdOrderByStartedAtDescIdDesc(fishermanId)
            : tripRepo.findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(fishermanId, statusFilter);
        String fishermanName = resolveFishermanName(fishermanId);
        return entities.stream().map(e -> tripMapper.toModel(e, fishermanName)).toList();
    }

    @Transactional
    public com.mermaid.app.model.Trip startTrip(TripStartRequest req, Long fishermanId) {
        Trip trip = new Trip();
        trip.setFishermanId(fishermanId);
        trip.setDeparturePoint(req.getDeparturePoint());
        trip.setTargetArea(req.getTargetArea());
        if (req.getVesselName() != null && req.getVesselName().isPresent()) {
            trip.setVesselName(req.getVesselName().get());
        }
        if (req.getNotes() != null && req.getNotes().isPresent()) {
            trip.setNotes(req.getNotes().get());
        }
        Trip saved = tripRepo.save(trip);
        return tripMapper.toModel(saved, resolveFishermanName(fishermanId));
    }

    @Transactional(readOnly = true)
    public com.mermaid.app.model.Trip getTripById(Long tripId, Long fishermanId) {
        Trip trip = tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));
        return tripMapper.toModel(trip, resolveFishermanName(fishermanId));
    }

    @Transactional
    public SafetyChecklist saveTripChecklist(Long tripId, SafetyChecklistRequest req, Long fishermanId) {
        Trip trip = tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));
        if (trip.getStatus() != TripStatus.ACTIVE) {
            throw new TripNotActiveException(tripId);
        }
        trip.setFuelChecked(req.getFuelChecked());
        trip.setEngineChecked(req.getEngineChecked());
        trip.setRadioChecked(req.getRadioChecked());
        trip.setLifeVestChecked(req.getLifeVestChecked());
        trip.setWeatherReviewed(req.getWeatherReviewed());
        trip.setEmergencyKitChecked(req.getEmergencyKitChecked());
        trip.setChecklistCompletedAt(OffsetDateTime.now());
        tripRepo.save(trip);
        // Return the SafetyChecklist model directly (not the full Trip)
        SafetyChecklist c = new SafetyChecklist();
        c.setFuelChecked(req.getFuelChecked());
        c.setEngineChecked(req.getEngineChecked());
        c.setRadioChecked(req.getRadioChecked());
        c.setLifeVestChecked(req.getLifeVestChecked());
        c.setWeatherReviewed(req.getWeatherReviewed());
        c.setEmergencyKitChecked(req.getEmergencyKitChecked());
        c.setChecklistCompletedAt(
            org.openapitools.jackson.nullable.JsonNullable.of(trip.getChecklistCompletedAt()));
        return c;
    }

    @Transactional
    public com.mermaid.app.model.Trip endTrip(Long tripId, TripEndRequest req, Long fishermanId) {
        Trip trip = tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));
        if (trip.getStatus() != TripStatus.ACTIVE) {
            throw new TripNotActiveException(tripId);
        }
        trip.setStatus(TripStatus.COMPLETED);
        trip.setEndedAt(OffsetDateTime.now());
        if (req != null && req.getNotes() != null && req.getNotes().isPresent()) {
            trip.setNotes(req.getNotes().get());
        }
        Trip saved = tripRepo.save(trip);
        return tripMapper.toModel(saved, resolveFishermanName(fishermanId));
    }
}

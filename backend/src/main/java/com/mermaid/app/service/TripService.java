package com.mermaid.app.service;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.mapper.TripMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.TripRepository;
import com.mermaid.app.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class TripService {

    private static final Logger log = LoggerFactory.getLogger(TripService.class);

    private final TripRepository tripRepo;
    private final TripMapper tripMapper;
    private final UserRepository userRepo;
    private final SmsService smsService;

    public TripService(TripRepository tripRepo, TripMapper tripMapper,
                       UserRepository userRepo, SmsService smsService) {
        this.tripRepo = tripRepo;
        this.tripMapper = tripMapper;
        this.userRepo = userRepo;
        this.smsService = smsService;
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

    private static <T> T unwrap(org.openapitools.jackson.nullable.JsonNullable<T> jn) {
        return (jn != null && jn.isPresent()) ? jn.get() : null;
    }

    @Transactional
    public com.mermaid.app.model.Trip startTrip(TripStartRequest req, Long fishermanId) {
        Trip trip = new Trip();
        trip.setFishermanId(fishermanId);
        trip.setDeparturePoint(unwrap(req.getDeparturePoint()));
        trip.setTargetArea(unwrap(req.getTargetArea()));
        if (req.getVesselName() != null && req.getVesselName().isPresent()) {
            trip.setVesselName(req.getVesselName().get());
        }
        if (req.getNotes() != null && req.getNotes().isPresent()) {
            trip.setNotes(req.getNotes().get());
        }
        if (req.getStatus() != null) {
            trip.setStatus(req.getStatus());
        }
        if (req.getStartedAt() != null && req.getStartedAt().isPresent()) {
            trip.setStartedAt(req.getStartedAt().get());
        }
        Trip saved = tripRepo.save(trip);
        sendDepartureSms(fishermanId, saved);
        return tripMapper.toModel(saved, resolveFishermanName(fishermanId));
    }

    @Transactional
    public com.mermaid.app.model.Trip updateTrip(Long tripId, TripStartRequest req, Long fishermanId) {
        Trip trip = tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));
            
        trip.setDeparturePoint(unwrap(req.getDeparturePoint()));
        trip.setTargetArea(unwrap(req.getTargetArea()));
        if (req.getVesselName() != null && req.getVesselName().isPresent()) {
            trip.setVesselName(req.getVesselName().get());
        }
        if (req.getNotes() != null && req.getNotes().isPresent()) {
            trip.setNotes(req.getNotes().get());
        }
        if (req.getStatus() != null) {
            trip.setStatus(req.getStatus());
        }
        if (req.getStartedAt() != null && req.getStartedAt().isPresent()) {
            trip.setStartedAt(req.getStartedAt().get());
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
        sendReturnSms(fishermanId);
        return tripMapper.toModel(saved, resolveFishermanName(fishermanId));
    }

    private void sendDepartureSms(Long fishermanId, Trip trip) {
        try {
            User user = userRepo.findById(fishermanId).orElse(null);
            if (user == null || user.getEmergencyContactPhone() == null) return;
            String vessel = trip.getVesselName() != null ? trip.getVesselName()
                : (user.getVesselName() != null ? user.getVesselName() : "vessel");
            String time = DateTimeFormatter.ofPattern("hh:mm a").format(OffsetDateTime.now());
            String msg = user.getFullName() + " has departed for fishing at " + time
                + ". Vessel: " + vessel + ". Expected return: early morning. - MERMAID Safety";
            smsService.send(user.getEmergencyContactPhone(), msg);
        } catch (Exception e) {
            log.warn("Departure SMS failed: {}", e.getMessage());
        }
    }

    private void sendReturnSms(Long fishermanId) {
        try {
            User user = userRepo.findById(fishermanId).orElse(null);
            if (user == null || user.getEmergencyContactPhone() == null) return;
            String time = DateTimeFormatter.ofPattern("hh:mm a").format(OffsetDateTime.now());
            String msg = user.getFullName() + " has returned safely at " + time + ". - MERMAID Safety";
            smsService.send(user.getEmergencyContactPhone(), msg);
        } catch (Exception e) {
            log.warn("Return SMS failed: {}", e.getMessage());
        }
    }
}

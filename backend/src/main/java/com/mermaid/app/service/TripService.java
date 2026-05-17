package com.mermaid.app.service;

import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.domain.CatchLog;
import com.mermaid.app.domain.Trip;
import com.mermaid.app.domain.User;
import com.mermaid.app.event.CatchAlertCreatedEvent;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.mapper.TripMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.CatchAlertRepository;
import com.mermaid.app.repository.CatchLogRepository;
import com.mermaid.app.repository.TripRepository;
import com.mermaid.app.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class TripService {

    private static final Logger log = LoggerFactory.getLogger(TripService.class);
    private static final int DEFAULT_ALERT_EXPIRY_HOURS = 4;

    private final TripRepository tripRepo;
    private final TripMapper tripMapper;
    private final UserRepository userRepo;
    private final SmsService smsService;
    private final CatchLogRepository catchLogRepo;
    private final CatchAlertRepository catchAlertRepo;
    private final ApplicationEventPublisher eventPublisher;

    public TripService(TripRepository tripRepo, TripMapper tripMapper,
                       UserRepository userRepo, SmsService smsService,
                       CatchLogRepository catchLogRepo,
                       CatchAlertRepository catchAlertRepo,
                       ApplicationEventPublisher eventPublisher) {
        this.tripRepo = tripRepo;
        this.tripMapper = tripMapper;
        this.userRepo = userRepo;
        this.smsService = smsService;
        this.catchLogRepo = catchLogRepo;
        this.catchAlertRepo = catchAlertRepo;
        this.eventPublisher = eventPublisher;
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

        // Auto-create catch alerts for all un-alerted catch logs
        autoCreateCatchAlerts(tripId, fishermanId, trip.getDeparturePoint());

        sendReturnSms(fishermanId);
        return tripMapper.toModel(saved, resolveFishermanName(fishermanId));
    }

    private void autoCreateCatchAlerts(Long tripId, Long fishermanId, String landingSite) {
        List<CatchLog> catches = catchLogRepo.findAllByTripIdOrderByLoggedAtDesc(tripId);
        if (catches.isEmpty()) return;

        // Find catch log IDs that already have an active/matched alert
        List<Long> logIds = catches.stream().map(CatchLog::getId).toList();
        Set<Long> alreadyAlerted = new HashSet<>(catchAlertRepo.findAlertedCatchLogIds(logIds));

        OffsetDateTime expiresAt = OffsetDateTime.now().plusHours(DEFAULT_ALERT_EXPIRY_HOURS);
        int created = 0;

        for (CatchLog c : catches) {
            if (alreadyAlerted.contains(c.getId())) continue;

            CatchAlert alert = new CatchAlert();
            alert.setFishermanId(fishermanId);
            alert.setSpecies(c.getSpecies());
            alert.setCatchLogId(c.getId());
            alert.setQuantityEstimate(c.getQuantityEstimate());
            if (c.getQuantityKg() != null) {
                alert.setQuantityKg(c.getQuantityKg());
            }
            if (c.getEstimatedPricePerKg() != null) {
                alert.setAskingPricePerKg(c.getEstimatedPricePerKg());
            }
            if (landingSite != null) {
                alert.setLandingSite(landingSite);
            }
            alert.setNotes(c.getNotes());
            alert.setExpiresAt(expiresAt);

            CatchAlert saved = catchAlertRepo.save(alert);
            eventPublisher.publishEvent(new CatchAlertCreatedEvent(saved.getId()));
            created++;
        }
        log.info("Trip {} ended: auto-created {} catch alerts from {} catch logs", tripId, created, catches.size());
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

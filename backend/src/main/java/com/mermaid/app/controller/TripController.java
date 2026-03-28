package com.mermaid.app.controller;

import com.mermaid.app.api.TripsApi;
import com.mermaid.app.model.*;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.TripService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class TripController implements TripsApi {

    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }

    @Override
    public ResponseEntity<List<Trip>> listTrips(TripStatus status) {
        return ResponseEntity.ok(tripService.listTrips(status, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<Trip> startTrip(TripStartRequest tripStartRequest) {
        return ResponseEntity.status(201).body(
            tripService.startTrip(tripStartRequest, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<Trip> getTripById(Long tripId) {
        return ResponseEntity.ok(tripService.getTripById(tripId, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<SafetyChecklist> saveTripChecklist(Long tripId,
                                                              SafetyChecklistRequest safetyChecklistRequest) {
        return ResponseEntity.ok(
            tripService.saveTripChecklist(tripId, safetyChecklistRequest, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<Trip> endTrip(Long tripId, TripEndRequest tripEndRequest) {
        return ResponseEntity.ok(
            tripService.endTrip(tripId, tripEndRequest, SecurityUtils.currentUserId()));
    }
}

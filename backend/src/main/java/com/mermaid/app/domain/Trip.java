package com.mermaid.app.domain;

import com.mermaid.app.model.TripStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "trips")
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fisherman_id", nullable = false)
    private Long fishermanId;

    @Column(name = "departure_point", nullable = false, length = 150)
    private String departurePoint;

    @Column(name = "target_area", nullable = false, length = 150)
    private String targetArea;

    @Column(name = "vessel_name", length = 100)
    private String vesselName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TripStatus status = TripStatus.ACTIVE;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @Column(length = 500)
    private String notes;

    @Column(name = "fuel_checked")
    private Boolean fuelChecked;

    @Column(name = "engine_checked")
    private Boolean engineChecked;

    @Column(name = "radio_checked")
    private Boolean radioChecked;

    @Column(name = "life_vest_checked")
    private Boolean lifeVestChecked;

    @Column(name = "weather_reviewed")
    private Boolean weatherReviewed;

    @Column(name = "emergency_kit_checked")
    private Boolean emergencyKitChecked;

    @Column(name = "checklist_completed_at")
    private OffsetDateTime checklistCompletedAt;

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) startedAt = OffsetDateTime.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getFishermanId() { return fishermanId; }
    public void setFishermanId(Long fishermanId) { this.fishermanId = fishermanId; }
    public String getDeparturePoint() { return departurePoint; }
    public void setDeparturePoint(String departurePoint) { this.departurePoint = departurePoint; }
    public String getTargetArea() { return targetArea; }
    public void setTargetArea(String targetArea) { this.targetArea = targetArea; }
    public String getVesselName() { return vesselName; }
    public void setVesselName(String vesselName) { this.vesselName = vesselName; }
    public TripStatus getStatus() { return status; }
    public void setStatus(TripStatus status) { this.status = status; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }
    public OffsetDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(OffsetDateTime endedAt) { this.endedAt = endedAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Boolean getFuelChecked() { return fuelChecked; }
    public void setFuelChecked(Boolean fuelChecked) { this.fuelChecked = fuelChecked; }
    public Boolean getEngineChecked() { return engineChecked; }
    public void setEngineChecked(Boolean engineChecked) { this.engineChecked = engineChecked; }
    public Boolean getRadioChecked() { return radioChecked; }
    public void setRadioChecked(Boolean radioChecked) { this.radioChecked = radioChecked; }
    public Boolean getLifeVestChecked() { return lifeVestChecked; }
    public void setLifeVestChecked(Boolean lifeVestChecked) { this.lifeVestChecked = lifeVestChecked; }
    public Boolean getWeatherReviewed() { return weatherReviewed; }
    public void setWeatherReviewed(Boolean weatherReviewed) { this.weatherReviewed = weatherReviewed; }
    public Boolean getEmergencyKitChecked() { return emergencyKitChecked; }
    public void setEmergencyKitChecked(Boolean emergencyKitChecked) { this.emergencyKitChecked = emergencyKitChecked; }
    public OffsetDateTime getChecklistCompletedAt() { return checklistCompletedAt; }
    public void setChecklistCompletedAt(OffsetDateTime checklistCompletedAt) { this.checklistCompletedAt = checklistCompletedAt; }
}

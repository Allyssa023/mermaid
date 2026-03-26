package com.mermaid.app.mapper;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.model.SafetyChecklist;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

@Component
public class TripMapper {

    public com.mermaid.app.model.Trip toModel(Trip entity, String fishermanName) {
        com.mermaid.app.model.Trip m = new com.mermaid.app.model.Trip(
            entity.getId(),
            entity.getFishermanId(),
            entity.getStatus(),
            entity.getStartedAt()
        );
        m.setFishermanName(JsonNullable.of(fishermanName));
        m.setDeparturePoint(JsonNullable.of(entity.getDeparturePoint()));
        m.setTargetArea(JsonNullable.of(entity.getTargetArea()));
        m.setVesselName(JsonNullable.of(entity.getVesselName()));
        m.setEndedAt(JsonNullable.of(entity.getEndedAt()));
        m.setNotes(JsonNullable.of(entity.getNotes()));
        m.setChecklist(JsonNullable.of(buildChecklist(entity)));
        return m;
    }

    private SafetyChecklist buildChecklist(Trip entity) {
        if (entity.getFuelChecked() == null
                && entity.getEngineChecked() == null
                && entity.getRadioChecked() == null
                && entity.getLifeVestChecked() == null
                && entity.getWeatherReviewed() == null
                && entity.getEmergencyKitChecked() == null) {
            return null;
        }
        SafetyChecklist c = new SafetyChecklist();
        c.setFuelChecked(entity.getFuelChecked());
        c.setEngineChecked(entity.getEngineChecked());
        c.setRadioChecked(entity.getRadioChecked());
        c.setLifeVestChecked(entity.getLifeVestChecked());
        c.setWeatherReviewed(entity.getWeatherReviewed());
        c.setEmergencyKitChecked(entity.getEmergencyKitChecked());
        c.setChecklistCompletedAt(JsonNullable.of(entity.getChecklistCompletedAt()));
        return c;
    }
}

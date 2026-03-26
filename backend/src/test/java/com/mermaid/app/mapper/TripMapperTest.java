package com.mermaid.app.mapper;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.model.TripStatus;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

class TripMapperTest {

    private final TripMapper mapper = new TripMapper();

    @Test
    void toModel_nullChecklist_returnsNullChecklist() {
        Trip entity = tripEntity();
        // All 6 checklist booleans remain null

        com.mermaid.app.model.Trip model = mapper.toModel(entity, "Isidro Cruz");

        assertEquals(1L, model.getId());
        assertEquals(42L, model.getFishermanId());
        assertNull(model.getChecklist().get()); // JsonNullable.of(null)
    }

    @Test
    void toModel_withChecklist_buildsChecklistFromColumns() {
        Trip entity = tripEntity();
        entity.setFuelChecked(true);
        entity.setEngineChecked(true);
        entity.setRadioChecked(false);
        entity.setLifeVestChecked(true);
        entity.setWeatherReviewed(true);
        entity.setEmergencyKitChecked(false);
        entity.setChecklistCompletedAt(OffsetDateTime.now());

        com.mermaid.app.model.Trip model = mapper.toModel(entity, "Isidro Cruz");

        var checklist = model.getChecklist().get();
        assertNotNull(checklist);
        assertTrue(checklist.getFuelChecked());
        assertFalse(checklist.getRadioChecked());
    }

    @Test
    void toModel_fishermanNameMapped() {
        Trip entity = tripEntity();

        com.mermaid.app.model.Trip model = mapper.toModel(entity, "Isidro Cruz");

        assertEquals("Isidro Cruz", model.getFishermanName().get());
    }

    private Trip tripEntity() {
        Trip e = new Trip();
        e.setId(1L);
        e.setFishermanId(42L);
        e.setStatus(TripStatus.ACTIVE);
        e.setDeparturePoint("Navotas Port");
        e.setTargetArea("Manila Bay");
        e.setStartedAt(OffsetDateTime.now());
        return e;
    }
}

package com.mermaid.app.mapper;

import com.mermaid.app.domain.CatchLog;
import com.mermaid.app.domain.FishSpecies;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

class CatchLogMapperTest {

    private final CatchLogMapper mapper = new CatchLogMapper(new FishSpeciesMapper());

    @Test
    void toModel_mapsAllFields() {
        FishSpecies species = new FishSpecies();
        species.setId(3L);
        species.setCommonName("Bangus");
        species.setActive(true);

        CatchLog entity = new CatchLog();
        entity.setId(10L);
        entity.setTripId(1L);
        entity.setSpecies(species);
        entity.setQuantityKg(new BigDecimal("5.5"));
        entity.setEstimatedPricePerKg(new BigDecimal("120.00"));
        entity.setMatchedListingId(7L);
        entity.setNotes("fresh");
        entity.setLoggedAt(OffsetDateTime.now());

        com.mermaid.app.model.CatchLog model = mapper.toModel(entity);

        assertEquals(10L, model.getId());
        assertEquals(1L, model.getTripId());
        assertEquals("Bangus", model.getSpecies().getCommonName());
        assertEquals(5.5, model.getQuantityKg());
        assertEquals(120.0, model.getEstimatedPricePerKg().get());
        assertEquals(7L, model.getMatchedListingId().get());
        assertEquals("fresh", model.getNotes().get());
    }

    @Test
    void toModel_nullOptionalFields_mapToUndefined() {
        FishSpecies species = new FishSpecies();
        species.setId(3L);
        species.setCommonName("Bangus");
        species.setActive(true);

        CatchLog entity = new CatchLog();
        entity.setId(10L);
        entity.setTripId(1L);
        entity.setSpecies(species);
        entity.setQuantityKg(new BigDecimal("5.0"));
        entity.setLoggedAt(OffsetDateTime.now());
        // estimatedPricePerKg, matchedListingId, notes all null

        com.mermaid.app.model.CatchLog model = mapper.toModel(entity);

        assertNull(model.getEstimatedPricePerKg().get());
        assertNull(model.getMatchedListingId().get());
        assertNull(model.getNotes().get());
    }
}

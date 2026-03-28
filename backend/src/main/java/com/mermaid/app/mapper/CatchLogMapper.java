package com.mermaid.app.mapper;

import com.mermaid.app.domain.CatchLog;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class CatchLogMapper {

    private final FishSpeciesMapper fishSpeciesMapper;

    public CatchLogMapper(FishSpeciesMapper fishSpeciesMapper) {
        this.fishSpeciesMapper = fishSpeciesMapper;
    }

    public com.mermaid.app.model.CatchLog toModel(CatchLog entity) {
        com.mermaid.app.model.CatchLog m = new com.mermaid.app.model.CatchLog(
            entity.getId(),
            entity.getTripId(),
            fishSpeciesMapper.toModel(entity.getSpecies()),
            toDouble(entity.getQuantityKg()),
            entity.getLoggedAt()
        );
        m.setEstimatedPricePerKg(JsonNullable.of(toDouble(entity.getEstimatedPricePerKg())));
        m.setMatchedListingId(JsonNullable.of(entity.getMatchedListingId()));
        m.setNotes(JsonNullable.of(entity.getNotes()));
        return m;
    }

    private static Double toDouble(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }
}

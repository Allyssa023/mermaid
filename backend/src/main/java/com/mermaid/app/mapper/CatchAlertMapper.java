package com.mermaid.app.mapper;

import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.model.UserRef;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class CatchAlertMapper {

    private final FishSpeciesMapper fishSpeciesMapper;

    public CatchAlertMapper(FishSpeciesMapper fishSpeciesMapper) {
        this.fishSpeciesMapper = fishSpeciesMapper;
    }

    public com.mermaid.app.model.CatchAlert toModel(CatchAlert entity, String fishermanName,
                                                      List<Long> matchedListingIds) {
        UserRef fisherman = new UserRef(entity.getFishermanId(), fishermanName != null ? fishermanName : "Unknown");

        com.mermaid.app.model.CatchAlert m = new com.mermaid.app.model.CatchAlert(
            entity.getId(),
            fisherman,
            fishSpeciesMapper.toModel(entity.getSpecies()),
            com.mermaid.app.model.CatchAlert.StatusEnum.fromValue(entity.getStatus()),
            entity.getExpiresAt(),
            entity.getCreatedAt()
        );
        m.setCatchLogId(JsonNullable.of(entity.getCatchLogId()));
        m.setQuantityEstimate(JsonNullable.of(entity.getQuantityEstimate()));
        m.setQuantityKg(JsonNullable.of(toDouble(entity.getQuantityKg())));
        m.setLandingSite(JsonNullable.of(entity.getLandingSite()));
        m.setAskingPricePerKg(JsonNullable.of(toDouble(entity.getAskingPricePerKg())));
        m.setNotes(JsonNullable.of(entity.getNotes()));
        m.setMatchedListingIds(matchedListingIds != null ? matchedListingIds : List.of());
        return m;
    }

    private static Double toDouble(BigDecimal v) {
        return v == null ? null : v.doubleValue();
    }
}

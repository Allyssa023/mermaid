package com.mermaid.app.mapper;

import com.mermaid.app.domain.FishSpecies;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

@Component
public class FishSpeciesMapper {

    public com.mermaid.app.model.FishSpecies toModel(FishSpecies entity) {
        com.mermaid.app.model.FishSpecies m =
            new com.mermaid.app.model.FishSpecies(
                entity.getId(), entity.getCommonName(), entity.isActive());
        m.setScientificName(JsonNullable.of(entity.getScientificName()));
        return m;
    }
}

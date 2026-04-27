package com.mermaid.app.mapper;

import com.mermaid.app.domain.MarketLocation;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

@Component
public class MarketLocationMapper {

    public com.mermaid.app.model.MarketLocation toModel(MarketLocation entity) {
        com.mermaid.app.model.MarketLocation m =
            new com.mermaid.app.model.MarketLocation(
                entity.getId(), entity.getName(), entity.getMunicipality(), entity.isActive());
        m.setProvince(JsonNullable.of(entity.getProvince()));
        if (entity.getLat() != null) {
            m.setLat(JsonNullable.of(entity.getLat().doubleValue()));
        }
        if (entity.getLng() != null) {
            m.setLng(JsonNullable.of(entity.getLng().doubleValue()));
        }
        return m;
    }
}

package com.mermaid.app.mapper;

import com.mermaid.app.domain.Advisory;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

@Component
public class AdvisoryMapper {

    public com.mermaid.app.model.Advisory toModel(Advisory entity) {
        com.mermaid.app.model.Advisory m = new com.mermaid.app.model.Advisory(
            entity.getId(),
            entity.getTitle(),
            entity.getMessage(),
            entity.getSeverity(),
            entity.getAffectedArea(),
            entity.getActiveFrom(),
            entity.getActiveTo(),
            entity.isActive()
        );
        m.setCreatedByUserId(JsonNullable.of(entity.getCreatedByUserId()));
        m.setCreatedAt(entity.getCreatedAt());
        return m;
    }
}

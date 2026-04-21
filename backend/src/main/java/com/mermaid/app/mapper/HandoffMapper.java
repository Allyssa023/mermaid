package com.mermaid.app.mapper;

import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

@Component
public class HandoffMapper {

    public com.mermaid.app.model.HandoffConfirmation toModel(com.mermaid.app.domain.HandoffConfirmation entity) {
        com.mermaid.app.model.HandoffConfirmation m = new com.mermaid.app.model.HandoffConfirmation(
            entity.getId(),
            entity.getOrderId(),
            entity.getActualQtyKg().doubleValue(),
            entity.getFinalPricePerKg().doubleValue(),
            entity.getTotalAmount().doubleValue(),
            entity.getConfirmedByBuyer(),
            entity.getConfirmedBySeller(),
            com.mermaid.app.model.HandoffConfirmation.StatusEnum.fromValue(entity.getStatus()),
            entity.getCreatedAt()
        );
        m.setDisputeReason(JsonNullable.of(entity.getDisputeReason()));
        m.setConfirmedAt(JsonNullable.of(entity.getConfirmedAt()));
        return m;
    }
}

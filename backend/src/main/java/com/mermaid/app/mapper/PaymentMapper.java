package com.mermaid.app.mapper;

import com.mermaid.app.domain.Payment;
import com.mermaid.app.model.PaymentRecord;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper {

    public PaymentRecord toModel(Payment entity) {
        PaymentRecord m = new PaymentRecord(
            entity.getId(),
            entity.getOrderId(),
            entity.getAmount().doubleValue(),
            entity.getMethod(),
            PaymentRecord.StatusEnum.fromValue(entity.getStatus()),
            entity.getCreatedAt()
        );
        m.setHandoffId(JsonNullable.of(entity.getHandoffId()));
        m.setProofReference(JsonNullable.of(entity.getProofReference()));
        m.setPaidAt(JsonNullable.of(entity.getPaidAt()));
        return m;
    }
}

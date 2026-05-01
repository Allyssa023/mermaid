package com.mermaid.app.mapper;

import com.mermaid.app.domain.BuyerAddress;
import com.mermaid.app.model.BuyerAddressCreateRequest;
import com.mermaid.app.model.BuyerAddressUpdateRequest;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class BuyerAddressMapper {

    public com.mermaid.app.model.BuyerAddress toModel(BuyerAddress e) {
        com.mermaid.app.model.BuyerAddress m = new com.mermaid.app.model.BuyerAddress(
                e.getId(), e.getLabel(), e.getRecipientName(),
                e.getAddressLine1(), e.getCity(), e.isDefault());
        m.setPhone(JsonNullable.of(e.getPhone()));
        m.setAddressLine2(JsonNullable.of(e.getAddressLine2()));
        m.setBarangay(JsonNullable.of(e.getBarangay()));
        m.setProvince(JsonNullable.of(e.getProvince()));
        m.setPostalCode(JsonNullable.of(e.getPostalCode()));
        m.setLatitude(JsonNullable.of(e.getLatitude() != null ? e.getLatitude().doubleValue() : null));
        m.setLongitude(JsonNullable.of(e.getLongitude() != null ? e.getLongitude().doubleValue() : null));
        m.setOneLine(JsonNullable.of(e.toSingleLine()));
        return m;
    }

    public void applyCreate(BuyerAddressCreateRequest req, BuyerAddress entity) {
        entity.setLabel(req.getLabel());
        entity.setRecipientName(req.getRecipientName());
        entity.setPhone(req.getPhone());
        entity.setAddressLine1(req.getAddressLine1());
        entity.setAddressLine2(req.getAddressLine2());
        entity.setBarangay(req.getBarangay());
        entity.setCity(req.getCity());
        entity.setProvince(req.getProvince());
        entity.setPostalCode(req.getPostalCode());
        entity.setLatitude(req.getLatitude() != null ? BigDecimal.valueOf(req.getLatitude()) : null);
        entity.setLongitude(req.getLongitude() != null ? BigDecimal.valueOf(req.getLongitude()) : null);
    }

    public void applyUpdate(BuyerAddressUpdateRequest req, BuyerAddress entity) {
        if (req.getLabel() != null)         entity.setLabel(req.getLabel());
        if (req.getRecipientName() != null) entity.setRecipientName(req.getRecipientName());
        if (req.getPhone() != null)         entity.setPhone(req.getPhone());
        if (req.getAddressLine1() != null)  entity.setAddressLine1(req.getAddressLine1());
        if (req.getAddressLine2() != null)  entity.setAddressLine2(req.getAddressLine2());
        if (req.getBarangay() != null)      entity.setBarangay(req.getBarangay());
        if (req.getCity() != null)          entity.setCity(req.getCity());
        if (req.getProvince() != null)      entity.setProvince(req.getProvince());
        if (req.getPostalCode() != null)    entity.setPostalCode(req.getPostalCode());
        if (req.getLatitude() != null)      entity.setLatitude(BigDecimal.valueOf(req.getLatitude()));
        if (req.getLongitude() != null)     entity.setLongitude(BigDecimal.valueOf(req.getLongitude()));
    }
}

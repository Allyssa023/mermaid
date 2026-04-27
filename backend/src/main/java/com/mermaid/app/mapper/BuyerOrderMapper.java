package com.mermaid.app.mapper;

import com.mermaid.app.domain.Order;
import com.mermaid.app.model.UserRef;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

@Component
public class BuyerOrderMapper {

    public com.mermaid.app.model.Order toModel(Order entity) {
        com.mermaid.app.model.Order m = new com.mermaid.app.model.Order();
        m.setId(entity.getId());

        UserRef buyer = new UserRef();
        buyer.setId(entity.getBuyerId());
        m.setBuyer(buyer);

        UserRef seller = new UserRef();
        seller.setId(entity.getSellerId());
        m.setSeller(seller);

        m.setDemandListingId(JsonNullable.of(entity.getDemandListingId()));

        if (entity.getSpecies() != null) {
            com.mermaid.app.model.FishSpecies speciesModel = new com.mermaid.app.model.FishSpecies();
            speciesModel.setId(entity.getSpecies().getId());
            speciesModel.setCommonName(entity.getSpecies().getCommonName());
            speciesModel.setActive(entity.getSpecies().isActive());
            m.setSpecies(speciesModel);
        }

        m.setOrderedQtyKg(JsonNullable.of(
                entity.getOrderedQtyKg() != null ? entity.getOrderedQtyKg().doubleValue() : null));
        m.setOrderedQtyEstimate(JsonNullable.of(entity.getOrderedQtyEstimate()));
        m.setAgreedPricePerKg(
                entity.getAgreedPricePerKg() != null ? entity.getAgreedPricePerKg().doubleValue() : null);
        m.setDispatchMode(JsonNullable.of(entity.getDispatchMode()));
        m.setDeliveryAddress(JsonNullable.of(entity.getDeliveryAddress()));

        if (entity.getStatus() != null) {
            m.setStatus(com.mermaid.app.model.Order.StatusEnum.fromValue(entity.getStatus()));
        }

        m.setNotes(JsonNullable.of(entity.getNotes()));
        m.setCreatedAt(entity.getCreatedAt());
        return m;
    }
}

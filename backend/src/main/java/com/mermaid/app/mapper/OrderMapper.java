package com.mermaid.app.mapper;

import com.mermaid.app.domain.HandoffConfirmation;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.Payment;
import com.mermaid.app.model.UserRef;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class OrderMapper {

    private final FishSpeciesMapper fishSpeciesMapper;
    private final HandoffMapper handoffMapper;
    private final PaymentMapper paymentMapper;

    public OrderMapper(FishSpeciesMapper fishSpeciesMapper,
                       HandoffMapper handoffMapper,
                       PaymentMapper paymentMapper) {
        this.fishSpeciesMapper = fishSpeciesMapper;
        this.handoffMapper = handoffMapper;
        this.paymentMapper = paymentMapper;
    }

    public com.mermaid.app.model.Order toModel(Order entity,
                                                String buyerName, String sellerName,
                                                HandoffConfirmation handoff,
                                                Payment payment) {
        UserRef buyer  = new UserRef(entity.getBuyerId(),  buyerName  != null ? buyerName  : "Unknown");
        UserRef seller = new UserRef(entity.getSellerId(), sellerName != null ? sellerName : "Unknown");

        com.mermaid.app.model.Order m = new com.mermaid.app.model.Order(
            entity.getId(),
            buyer,
            seller,
            fishSpeciesMapper.toModel(entity.getSpecies()),
            entity.getAgreedPricePerKg().doubleValue(),
            com.mermaid.app.model.Order.StatusEnum.fromValue(entity.getStatus()),
            entity.getCreatedAt()
        );
        m.setCatchAlertId(JsonNullable.of(entity.getCatchAlertId()));
        m.setDemandListingId(JsonNullable.of(entity.getDemandListingId()));
        m.setOrderedQtyEstimate(JsonNullable.of(entity.getOrderedQtyEstimate()));
        m.setOrderedQtyKg(JsonNullable.of(toDouble(entity.getOrderedQtyKg())));
        m.setDispatchMode(JsonNullable.of(entity.getDispatchMode()));
        m.setNotes(JsonNullable.of(entity.getNotes()));
        m.setUpdatedAt(entity.getUpdatedAt());
        m.setHandoff(handoff != null ? handoffMapper.toModel(handoff) : null);
        m.setPayment(payment != null ? paymentMapper.toModel(payment) : null);
        return m;
    }

    private static Double toDouble(BigDecimal v) {
        return v == null ? null : v.doubleValue();
    }
}

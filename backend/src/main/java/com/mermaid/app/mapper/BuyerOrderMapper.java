package com.mermaid.app.mapper;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.domain.User;
import com.mermaid.app.model.UserRef;
import com.mermaid.app.repository.HandoffConfirmationRepository;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.repository.ShopProfileRepository;
import com.mermaid.app.repository.UserRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

@Component
public class BuyerOrderMapper {

    private final UserRepository userRepo;
    private final ShopProfileRepository shopProfileRepo;
    private final HandoffConfirmationRepository handoffRepo;
    private final PaymentRepository paymentRepo;
    private final HandoffMapper handoffMapper;
    private final PaymentMapper paymentMapper;

    public BuyerOrderMapper(UserRepository userRepo,
                            ShopProfileRepository shopProfileRepo,
                            HandoffConfirmationRepository handoffRepo,
                            PaymentRepository paymentRepo,
                            HandoffMapper handoffMapper,
                            PaymentMapper paymentMapper) {
        this.userRepo = userRepo;
        this.shopProfileRepo = shopProfileRepo;
        this.handoffRepo = handoffRepo;
        this.paymentRepo = paymentRepo;
        this.handoffMapper = handoffMapper;
        this.paymentMapper = paymentMapper;
    }

    public com.mermaid.app.model.Order toModel(Order entity) {
        com.mermaid.app.model.Order m = new com.mermaid.app.model.Order();
        m.setId(entity.getId());

        UserRef buyer = new UserRef();
        buyer.setId(entity.getBuyerId());
        m.setBuyer(buyer);

        UserRef seller = new UserRef();
        seller.setId(entity.getSellerId());
        // Prefer the vendor's shop display name when available, fall back to full name
        String shopName = shopProfileRepo.findByVendorIdAndIsDeletedFalse(entity.getSellerId())
                .map(sp -> sp.getDisplayName())
                .orElse(null);
        if (shopName != null && !shopName.isBlank()) {
            seller.setFullName(shopName);
        } else {
            userRepo.findById(entity.getSellerId())
                    .map(User::getFullName)
                    .ifPresent(seller::setFullName);
        }
        m.setSeller(seller);

        m.setDemandListingId(JsonNullable.of(entity.getDemandListingId()));
        if (entity.getCartCheckoutId() != null) {
            m.setCartCheckoutId(JsonNullable.of(entity.getCartCheckoutId()));
        }

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

        // Map the new fields
        m.setPaymentMethod(JsonNullable.of(entity.getPaymentMethod()));
        m.setKind(JsonNullable.of(OrderKind.PROCUREMENT.equals(entity.getKind())
            ? com.mermaid.app.model.Order.KindEnum.PROCUREMENT
            : com.mermaid.app.model.Order.KindEnum.RETAIL));
        m.setCatchAlertId(JsonNullable.of(entity.getCatchAlertId()));
        m.setDeliveryFee(JsonNullable.of(
                entity.getDeliveryFee() != null ? entity.getDeliveryFee().doubleValue() : null));
        m.setUpdatedAt(entity.getUpdatedAt());

        handoffRepo.findByOrderId(entity.getId()).ifPresent(h ->
            m.setHandoff(handoffMapper.toModel(h))
        );

        paymentRepo.findByOrderId(entity.getId()).ifPresent(p ->
            m.setPayment(paymentMapper.toModel(p))
        );

        return m;
    }
}

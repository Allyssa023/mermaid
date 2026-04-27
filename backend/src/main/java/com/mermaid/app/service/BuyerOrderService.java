package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.Order;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.BuyerOrderMapper;
import com.mermaid.app.model.BuyerPlaceOrderRequest;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.OrderRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BuyerOrderService {

    private final OrderRepository orderRepository;
    private final DemandListingRepository listingRepo;
    private final BuyerOrderMapper buyerOrderMapper;

    public BuyerOrderService(OrderRepository orderRepository,
                             DemandListingRepository listingRepo,
                             BuyerOrderMapper buyerOrderMapper) {
        this.orderRepository = orderRepository;
        this.listingRepo = listingRepo;
        this.buyerOrderMapper = buyerOrderMapper;
    }

    @Transactional
    public com.mermaid.app.model.Order placeOrder(BuyerPlaceOrderRequest request, Long buyerId) {
        DemandListing listing = listingRepo.findById(request.getListingId())
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found"));

        if (listing.isDeleted() || listing.getStatus() != DemandListingStatus.OPEN) {
            throw new ResourceNotFoundException("Listing is not available");
        }

        String dispatchMode = request.getDispatchMode().getValue();
        if ("DELIVERY".equals(dispatchMode)) {
            JsonNullable<String> addrNullable = request.getDeliveryAddress();
            String addr = (addrNullable != null && addrNullable.isPresent()) ? addrNullable.get() : null;
            if (addr == null || addr.isBlank()) {
                throw new IllegalArgumentException("deliveryAddress is required for DELIVERY orders");
            }
        }

        Order order = new Order();
        order.setBuyerId(buyerId);
        order.setSellerId(listing.getVendorId());
        order.setDemandListingId(listing.getId());
        order.setSpecies(listing.getSpecies());
        order.setAgreedPricePerKg(listing.getOfferPricePerKg());
        order.setDispatchMode(dispatchMode);

        JsonNullable<Double> qtyKgNullable = request.getOrderedQtyKg();
        if (qtyKgNullable != null && qtyKgNullable.isPresent() && qtyKgNullable.get() != null) {
            order.setOrderedQtyKg(BigDecimal.valueOf(qtyKgNullable.get()));
        }

        JsonNullable<String> qtyEstNullable = request.getOrderedQtyEstimate();
        if (qtyEstNullable != null && qtyEstNullable.isPresent()) {
            order.setOrderedQtyEstimate(qtyEstNullable.get());
        }

        JsonNullable<String> addrNullable = request.getDeliveryAddress();
        if (addrNullable != null && addrNullable.isPresent()) {
            order.setDeliveryAddress(addrNullable.get());
        }

        JsonNullable<String> notesNullable = request.getNotes();
        if (notesNullable != null && notesNullable.isPresent()) {
            order.setNotes(notesNullable.get());
        }

        Order saved = orderRepository.save(order);
        return buyerOrderMapper.toModel(saved);
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.Order> getMyOrders(Long buyerId, String status) {
        List<Order> orders;
        if (status != null && !status.isBlank()) {
            orders = orderRepository.findAllByParticipantAndStatus(buyerId, status);
        } else {
            orders = orderRepository.findAllByParticipant(buyerId);
        }
        return orders.stream()
                .filter(o -> o.getBuyerId().equals(buyerId))
                .map(buyerOrderMapper::toModel)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public com.mermaid.app.model.Order getOrderById(Long orderId, Long buyerId) {
        Order order = orderRepository.findByIdAndParticipant(orderId, buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!order.getBuyerId().equals(buyerId)) {
            throw new ResourceNotFoundException("Order not found");
        }
        return buyerOrderMapper.toModel(order);
    }
}

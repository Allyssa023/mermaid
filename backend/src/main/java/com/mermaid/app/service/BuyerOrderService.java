package com.mermaid.app.service;

import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.Payment;
import com.mermaid.app.domain.StorefrontListing;
import com.mermaid.app.domain.StorefrontListingStatus;
import com.mermaid.app.exception.InsufficientStockException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.BuyerOrderMapper;
import com.mermaid.app.model.BuyerPlaceOrderRequest;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.repository.StorefrontListingRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BuyerOrderService {

    private final OrderRepository orderRepository;
    private final StorefrontListingRepository storefrontListingRepo;
    private final FishSpeciesRepository fishSpeciesRepo;
    private final BuyerOrderMapper buyerOrderMapper;
    private final OrderTimelineService timelineService;
    private final PaymentRepository paymentRepo;
    private final InventoryService inventoryService;

    public BuyerOrderService(OrderRepository orderRepository,
                             StorefrontListingRepository storefrontListingRepo,
                             FishSpeciesRepository fishSpeciesRepo,
                             BuyerOrderMapper buyerOrderMapper,
                             OrderTimelineService timelineService,
                             PaymentRepository paymentRepo,
                             InventoryService inventoryService) {
        this.orderRepository = orderRepository;
        this.storefrontListingRepo = storefrontListingRepo;
        this.fishSpeciesRepo = fishSpeciesRepo;
        this.buyerOrderMapper = buyerOrderMapper;
        this.timelineService = timelineService;
        this.paymentRepo = paymentRepo;
        this.inventoryService = inventoryService;
    }

    @Transactional
    public com.mermaid.app.model.Order placeOrder(BuyerPlaceOrderRequest request, Long buyerId) {
        StorefrontListing listing = storefrontListingRepo.findByIdWithLock(request.getListingId())
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found"));

        if (listing.getStatus() != StorefrontListingStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Listing is not available");
        }

        // Layer 3: re-validate stock inside this transaction with pessimistic lock
        JsonNullable<Double> qtyNullable = request.getOrderedQtyKg();
        if (qtyNullable != null && qtyNullable.isPresent() && qtyNullable.get() != null) {
            BigDecimal orderedQty = BigDecimal.valueOf(qtyNullable.get());
            BigDecimal effective = inventoryService.effectiveAvailableKg(listing);
            if (orderedQty.compareTo(effective) > 0) {
                throw new InsufficientStockException("Stock changed — only " + effective + " kg available");
            }
        }

        FishSpecies fishSpecies = fishSpeciesRepo.findById(listing.getSpeciesId())
                .orElseThrow(() -> new ResourceNotFoundException("Species not found"));

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
        order.setStorefrontListingId(listing.getId());
        order.setSpecies(fishSpecies);
        order.setAgreedPricePerKg(listing.getPricePerKg());
        order.setDispatchMode(dispatchMode);

        // Snapshot delivery fee (0 for PICKUP, listing fee for DELIVERY)
        if ("DELIVERY".equals(dispatchMode) && listing.getDeliveryFee() != null) {
            order.setDeliveryFee(listing.getDeliveryFee());
        } else {
            order.setDeliveryFee(BigDecimal.ZERO);
        }

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
        timelineService.recordEvent(saved.getId(), "PENDING", buyerId, "Order placed by buyer");
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

    @Transactional
    public com.mermaid.app.model.Order confirmReceipt(Long orderId, Long buyerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!buyerId.equals(order.getBuyerId())) {
            throw new org.springframework.security.access.AccessDeniedException("Not your order");
        }
        if (!"AWAITING_RECEIPT".equals(order.getStatus())) {
            throw new IllegalStateException("Order is not awaiting receipt confirmation");
        }
        // Settle COD payment if pending
        paymentRepo.findByOrderId(orderId).ifPresent(payment -> {
            if ("COD".equals(payment.getMethod()) && "PENDING".equals(payment.getStatus())) {
                payment.setStatus("CONFIRMED");
                payment.setPaidAt(OffsetDateTime.now());
                paymentRepo.save(payment);
            }
        });
        order.setStatus("COMPLETED");
        order.setCompletedAt(OffsetDateTime.now());
        orderRepository.save(order);
        timelineService.recordEvent(orderId, "COMPLETED", buyerId, "Buyer confirmed receipt");
        return buyerOrderMapper.toModel(order);
    }

    @Transactional
    public com.mermaid.app.model.Order disputeOrder(Long orderId, Long buyerId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!buyerId.equals(order.getBuyerId())) {
            throw new org.springframework.security.access.AccessDeniedException("Not your order");
        }
        if (!"AWAITING_RECEIPT".equals(order.getStatus())) {
            throw new IllegalStateException("Can only dispute an order in AWAITING_RECEIPT status");
        }
        order.setStatus("DISPUTED");
        orderRepository.save(order);
        timelineService.recordEvent(orderId, "DISPUTED", buyerId, "Buyer raised dispute: " + reason);
        return buyerOrderMapper.toModel(order);
    }
}

package com.mermaid.app.service;

import com.mermaid.app.domain.BuyerAddress;
import com.mermaid.app.domain.Cart;
import com.mermaid.app.domain.CartItem;
import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.Order;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.BuyerCheckoutGroupSpec;
import com.mermaid.app.model.BuyerCheckoutRequest;
import com.mermaid.app.model.BuyerCheckoutResult;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.repository.BuyerAddressRepository;
import com.mermaid.app.repository.CartRepository;
import com.mermaid.app.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CheckoutService {

    private final CartRepository cartRepo;
    private final BuyerAddressRepository addressRepo;
    private final OrderRepository orderRepo;

    public CheckoutService(CartRepository cartRepo,
                            BuyerAddressRepository addressRepo,
                            OrderRepository orderRepo) {
        this.cartRepo = cartRepo;
        this.addressRepo = addressRepo;
        this.orderRepo = orderRepo;
    }

    @Transactional
    public BuyerCheckoutResult checkout(Long buyerId, BuyerCheckoutRequest request) {
        if (request.getGroups() == null || request.getGroups().isEmpty()) {
            throw new IllegalArgumentException("At least one vendor group is required.");
        }

        Cart cart = cartRepo.findByBuyerId(buyerId)
                .orElseThrow(() -> new IllegalArgumentException("Cart is empty."));
        if (cart.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cart is empty.");
        }

        Map<Long, BuyerCheckoutGroupSpec> specsByVendor = new HashMap<>();
        for (BuyerCheckoutGroupSpec g : request.getGroups()) {
            if (g.getVendorId() == null) throw new IllegalArgumentException("vendorId is required");
            specsByVendor.put(g.getVendorId(), g);
        }

        // Validate every cart item is satisfiable AND has a matching group spec.
        for (CartItem ci : cart.getItems()) {
            DemandListing listing = ci.getListing();
            if (listing == null || listing.isDeleted()
                    || listing.getStatus() != DemandListingStatus.OPEN) {
                throw new ListingClosedException(
                        "One or more items are no longer available. Please update your cart.");
            }
            if (listing.getQuantityKg() != null
                    && ci.getQuantityKg().compareTo(listing.getQuantityKg()) > 0) {
                throw new ListingClosedException(
                        "Some items exceed available stock. Please update your cart.");
            }
            BuyerCheckoutGroupSpec spec = specsByVendor.get(listing.getVendorId());
            if (spec == null) {
                throw new IllegalArgumentException(
                        "Missing checkout group for vendor " + listing.getVendorId());
            }
        }

        // Resolve addresses for delivery groups up-front (fail fast).
        Map<Long, BuyerAddress> addrsByVendor = new HashMap<>();
        for (BuyerCheckoutGroupSpec spec : request.getGroups()) {
            if ("DELIVERY".equals(spec.getDispatchMode().getValue())) {
                if (spec.getAddressId() == null) {
                    throw new IllegalArgumentException(
                            "addressId required for DELIVERY group (vendor " + spec.getVendorId() + ")");
                }
                BuyerAddress addr = addressRepo.findByIdAndBuyerIdAndActiveTrue(spec.getAddressId(), buyerId)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Address not found: " + spec.getAddressId()));
                addrsByVendor.put(spec.getVendorId(), addr);
            }
        }

        // Create one Order per cart item, all tagged with the same checkout id
        // so My Orders can group them under one header.
        UUID cartCheckoutId = UUID.randomUUID();
        List<Long> orderIds = new ArrayList<>();
        BigDecimal grandTotal = BigDecimal.ZERO;
        for (CartItem ci : cart.getItems()) {
            DemandListing listing = ci.getListing();
            BuyerCheckoutGroupSpec spec = specsByVendor.get(listing.getVendorId());

            Order order = new Order();
            order.setBuyerId(buyerId);
            order.setSellerId(listing.getVendorId());
            order.setDemandListingId(listing.getId());
            order.setSpecies(listing.getSpecies());
            order.setAgreedPricePerKg(listing.getOfferPricePerKg());
            order.setOrderedQtyKg(ci.getQuantityKg());
            order.setDispatchMode(spec.getDispatchMode().getValue());
            order.setCartCheckoutId(cartCheckoutId);
            if ("DELIVERY".equals(spec.getDispatchMode().getValue())) {
                order.setDeliveryAddress(addrsByVendor.get(listing.getVendorId()).toSingleLine());
            }
            String notes = ci.getNotes();
            if (spec.getNotes() != null && !spec.getNotes().isBlank()) {
                notes = (notes == null || notes.isBlank()) ? spec.getNotes() : notes + " | " + spec.getNotes();
            }
            if (notes != null && !notes.isBlank()) order.setNotes(notes);

            Order saved = orderRepo.save(order);
            orderIds.add(saved.getId());
            grandTotal = grandTotal.add(ci.getUnitPriceSnapshot().multiply(ci.getQuantityKg()));
        }

        // Clear cart on success.
        cart.getItems().clear();
        cartRepo.save(cart);

        BuyerCheckoutResult result = new BuyerCheckoutResult(orderIds);
        result.setGrandTotal(grandTotal.doubleValue());
        return result;
    }
}

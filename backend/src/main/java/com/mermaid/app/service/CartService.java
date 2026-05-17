package com.mermaid.app.service;

import com.mermaid.app.domain.Cart;
import com.mermaid.app.domain.CartItem;
import com.mermaid.app.domain.StorefrontListing;
import com.mermaid.app.domain.StorefrontListingStatus;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.CartMapper;
import com.mermaid.app.model.AddCartItemRequest;
import com.mermaid.app.model.BuyerCartView;
import com.mermaid.app.model.UpdateCartItemRequest;
import com.mermaid.app.repository.CartItemRepository;
import com.mermaid.app.repository.CartRepository;
import com.mermaid.app.repository.StorefrontListingRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CartService {

    private final CartRepository cartRepo;
    private final CartItemRepository itemRepo;
    private final StorefrontListingRepository listingRepo;
    private final UserRepository userRepo;
    private final CartMapper mapper;

    public CartService(CartRepository cartRepo,
                       CartItemRepository itemRepo,
                       StorefrontListingRepository listingRepo,
                       UserRepository userRepo,
                       CartMapper mapper) {
        this.cartRepo = cartRepo;
        this.itemRepo = itemRepo;
        this.listingRepo = listingRepo;
        this.userRepo = userRepo;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public BuyerCartView getCart(Long buyerId) {
        Optional<Cart> existing = cartRepo.findByBuyerId(buyerId);
        if (existing.isEmpty()) {
            // Don't persist on read — return an empty view with null id.
            Cart empty = new Cart();
            empty.setBuyerId(buyerId);
            return mapper.toView(empty, Map.of());
        }
        return mapper.toView(existing.get(), batchVendors(existing.get()));
    }

    @Transactional
    public BuyerCartView addItem(Long buyerId, AddCartItemRequest req) {
        if (req.getListingId() == null) throw new IllegalArgumentException("listingId is required");
        BigDecimal qty = BigDecimal.valueOf(req.getQuantityKg());
        if (qty.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("quantityKg must be > 0");

        StorefrontListing listing = listingRepo.findByIdAndIsDeletedFalse(req.getListingId())
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + req.getListingId()));
        if (listing.getStatus() != StorefrontListingStatus.PUBLISHED) {
            throw new ListingClosedException("This listing is no longer accepting orders.");
        }

        Cart cart = cartRepo.findByBuyerId(buyerId).orElseGet(() -> {
            Cart c = new Cart();
            c.setBuyerId(buyerId);
            return cartRepo.save(c);
        });

        Optional<CartItem> existing = itemRepo.findByCart_IdAndListing_Id(cart.getId(), listing.getId());
        String notes = nullableNotes(req.getNotes());

        if (existing.isPresent()) {
            CartItem ci = existing.get();
            BigDecimal merged = ci.getQuantityKg().add(qty);
            ci.setQuantityKg(merged);
            if (notes != null) ci.setNotes(notes);
            itemRepo.save(ci);
        } else {
            CartItem ci = new CartItem();
            ci.setCart(cart);
            ci.setListing(listing);
            ci.setQuantityKg(qty);
            ci.setUnitPriceSnapshot(listing.getPricePerKg());
            ci.setNotes(notes);
            itemRepo.save(ci);
        }

        return getCart(buyerId);
    }

    @Transactional
    public BuyerCartView updateItem(Long buyerId, Long itemId, UpdateCartItemRequest req) {
        Cart cart = cartRepo.findByBuyerId(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found"));
        CartItem item = cart.getItems().stream()
                .filter(ci -> ci.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found: " + itemId));

        if (req.getQuantityKg() != null) {
            BigDecimal qty = BigDecimal.valueOf(req.getQuantityKg());
            if (qty.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("quantityKg must be > 0");
            StorefrontListing listing = item.getListing();
            if (listing.isDeleted() || listing.getStatus() != StorefrontListingStatus.PUBLISHED) {
                throw new ListingClosedException("This listing is no longer accepting orders.");
            }
            item.setQuantityKg(qty);
        }
        if (req.getNotes() != null) {
            item.setNotes(nullableNotes(req.getNotes()));
        }
        itemRepo.save(item);
        return getCart(buyerId);
    }

    @Transactional
    public BuyerCartView removeItem(Long buyerId, Long itemId) {
        Cart cart = cartRepo.findByBuyerId(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found"));
        CartItem item = cart.getItems().stream()
                .filter(ci -> ci.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found: " + itemId));
        cart.getItems().remove(item);
        itemRepo.delete(item);
        return getCart(buyerId);
    }

    @Transactional
    public BuyerCartView clearCart(Long buyerId) {
        cartRepo.findByBuyerId(buyerId).ifPresent(cart -> {
            cart.getItems().clear();
            cartRepo.save(cart);
        });
        return getCart(buyerId);
    }

    /**
     * Re-add a past order's listing to the cart. Returns warnings (not exceptions)
     * for closed listings or capped quantities so the buyer can see what changed.
     */
    @Transactional
    public ReorderResult reorder(Long buyerId, com.mermaid.app.domain.Order order) {
        java.util.List<String> warnings = new java.util.ArrayList<>();
        Long listingId = order.getStorefrontListingId();
        BigDecimal desiredQty = order.getOrderedQtyKg() != null
                ? order.getOrderedQtyKg() : BigDecimal.ONE;

        if (listingId == null) {
            warnings.add("Original order has no linked listing — nothing to re-add.");
            return new ReorderResult(getCart(buyerId), warnings);
        }

        Optional<StorefrontListing> listingOpt = listingRepo.findByIdAndIsDeletedFalse(listingId);
        if (listingOpt.isEmpty()) {
            warnings.add("This listing is no longer available.");
            return new ReorderResult(getCart(buyerId), warnings);
        }
        StorefrontListing listing = listingOpt.get();
        if (listing.getStatus() != StorefrontListingStatus.PUBLISHED) {
            warnings.add("This listing has closed and can't be re-ordered.");
            return new ReorderResult(getCart(buyerId), warnings);
        }

        BigDecimal qty = desiredQty;

        Cart cart = cartRepo.findByBuyerId(buyerId).orElseGet(() -> {
            Cart c = new Cart();
            c.setBuyerId(buyerId);
            return cartRepo.save(c);
        });

        Optional<CartItem> existing = itemRepo.findByCart_IdAndListing_Id(cart.getId(), listing.getId());
        if (existing.isPresent()) {
            CartItem ci = existing.get();
            BigDecimal merged = ci.getQuantityKg().add(qty);
            ci.setQuantityKg(merged);
            itemRepo.save(ci);
        } else {
            CartItem ci = new CartItem();
            ci.setCart(cart);
            ci.setListing(listing);
            ci.setQuantityKg(qty);
            ci.setUnitPriceSnapshot(listing.getPricePerKg());
            itemRepo.save(ci);
        }

        if (listing.getPricePerKg() != null
                && order.getAgreedPricePerKg() != null
                && listing.getPricePerKg().compareTo(order.getAgreedPricePerKg()) != 0) {
            warnings.add("Price has changed since your last order (was ₱"
                    + order.getAgreedPricePerKg() + "/kg, now ₱"
                    + listing.getPricePerKg() + "/kg).");
        }

        return new ReorderResult(getCart(buyerId), warnings);
    }

    public record ReorderResult(BuyerCartView cart, java.util.List<String> warnings) {}

    private Map<Long, User> batchVendors(Cart cart) {
        List<Long> vendorIds = cart.getItems().stream()
                .map(ci -> ci.getListing() != null ? ci.getListing().getVendorId() : null)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (vendorIds.isEmpty()) return Map.of();
        return userRepo.findAllById(vendorIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private String nullableNotes(String notes) {
        if (notes == null) return null;
        String trimmed = notes.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

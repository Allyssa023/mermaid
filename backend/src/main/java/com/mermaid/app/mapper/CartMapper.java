package com.mermaid.app.mapper;

import com.mermaid.app.domain.Cart;
import com.mermaid.app.domain.CartItem;
import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.User;
import com.mermaid.app.model.BuyerCartGroup;
import com.mermaid.app.model.BuyerCartItem;
import com.mermaid.app.model.BuyerCartView;
import com.mermaid.app.model.BuyerVendorProfile;
import com.mermaid.app.model.DemandListingStatus;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class CartMapper {

    private final DemandListingMapper listingMapper;

    public CartMapper(DemandListingMapper listingMapper) {
        this.listingMapper = listingMapper;
    }

    public BuyerCartView toView(Cart cart, Map<Long, User> vendorsById) {
        Map<Long, List<CartItem>> byVendor = new LinkedHashMap<>();
        for (CartItem ci : cart.getItems()) {
            DemandListing l = ci.getListing();
            if (l == null) continue;
            byVendor.computeIfAbsent(l.getVendorId(), k -> new ArrayList<>()).add(ci);
        }

        List<BuyerCartGroup> groups = new ArrayList<>();
        BigDecimal grandTotal = BigDecimal.ZERO;
        int itemCount = 0;
        List<String> warnings = new ArrayList<>();

        for (Map.Entry<Long, List<CartItem>> e : byVendor.entrySet()) {
            List<BuyerCartItem> items = new ArrayList<>();
            BigDecimal subtotal = BigDecimal.ZERO;
            for (CartItem ci : e.getValue()) {
                BuyerCartItem mapped = toItem(ci);
                items.add(mapped);
                subtotal = subtotal.add(BigDecimal.valueOf(mapped.getLineTotal()));
                itemCount++;
                if (mapped.getWarning() != null && mapped.getWarning().isPresent()) {
                    warnings.add(mapped.getWarning().get());
                }
            }
            User vendor = vendorsById.get(e.getKey());
            BuyerVendorProfile vendorProfile = vendor != null
                    ? listingMapper.toVendorProfile(vendor)
                    : new BuyerVendorProfile(e.getKey(), "Unknown Vendor");
            BuyerCartGroup group = new BuyerCartGroup(vendorProfile, items, subtotal.doubleValue());
            groups.add(group);
            grandTotal = grandTotal.add(subtotal);
        }

        BuyerCartView view = new BuyerCartView(groups, scale(grandTotal).doubleValue(), itemCount);
        view.setId(JsonNullable.of(cart.getId()));
        view.setWarnings(warnings);
        return view;
    }

    private BuyerCartItem toItem(CartItem ci) {
        DemandListing l = ci.getListing();
        BigDecimal qty = ci.getQuantityKg();
        BigDecimal snapshot = ci.getUnitPriceSnapshot();
        BigDecimal current = l.getOfferPricePerKg();
        BigDecimal lineTotal = scale(snapshot.multiply(qty));

        BuyerCartItem item = new BuyerCartItem(
                ci.getId(), l.getId(), l.getVendorId(),
                l.getSpecies() != null ? l.getSpecies().getCommonName() : "—",
                qty.doubleValue(),
                snapshot.doubleValue(),
                current != null ? current.doubleValue() : snapshot.doubleValue(),
                lineTotal.doubleValue(),
                ci.getAddedAt());

        item.setLocationName(JsonNullable.of(
                l.getLocation() != null ? l.getLocation().getName() : null));
        item.setNotes(JsonNullable.of(ci.getNotes()));

        String warning = computeWarning(l, qty, snapshot, current);
        item.setWarning(JsonNullable.of(warning));
        return item;
    }

    private String computeWarning(DemandListing l, BigDecimal qty, BigDecimal snapshot, BigDecimal current) {
        if (l.isDeleted() || l.getStatus() != DemandListingStatus.OPEN) {
            return "This listing is no longer available.";
        }
        if (l.getQuantityKg() != null && qty.compareTo(l.getQuantityKg()) > 0) {
            return "Vendor only has " + l.getQuantityKg() + "kg available.";
        }
        if (current != null && snapshot != null && current.compareTo(snapshot) != 0) {
            int cmp = current.compareTo(snapshot);
            return cmp > 0
                    ? "Price increased to ₱" + current + "/kg since you added this."
                    : "Price dropped to ₱" + current + "/kg since you added this.";
        }
        return null;
    }

    private static BigDecimal scale(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}

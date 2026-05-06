package com.mermaid.app.service;

import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.domain.ProcurementCartItem;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.CatchAlertRepository;
import com.mermaid.app.repository.ProcurementCartItemRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class ProcurementCartService {

    private final ProcurementCartItemRepository cartRepo;
    private final CatchAlertRepository alertRepo;

    public ProcurementCartService(ProcurementCartItemRepository cartRepo,
                                  CatchAlertRepository alertRepo) {
        this.cartRepo = cartRepo;
        this.alertRepo = alertRepo;
    }

    @Transactional(readOnly = true)
    public List<ProcurementCartItem> list(Long vendorId) {
        return cartRepo.findAllByVendorIdOrderByCreatedAtAsc(vendorId);
    }

    @Transactional
    public ProcurementCartItem addOrUpdate(Long vendorId, Long catchAlertId,
                                           BigDecimal qtyKg, BigDecimal offeredPricePerKg) {
        CatchAlert alert = alertRepo.findById(catchAlertId)
                .orElseThrow(() -> new ResourceNotFoundException("Catch alert not found: " + catchAlertId));

        if (!"ACTIVE".equals(alert.getStatus()) || alert.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ListingClosedException("Catch alert " + catchAlertId + " is no longer available");
        }

        BigDecimal available = alert.getQuantityKg() != null
                ? alert.getQuantityKg().subtract(alert.getClaimedKg())
                : null;
        if (available != null && qtyKg.compareTo(available) > 0) {
            throw new ListingClosedException("Only " + available + " kg available on alert " + catchAlertId);
        }

        ProcurementCartItem item = cartRepo.findByVendorIdAndCatchAlertId(vendorId, catchAlertId)
                .orElseGet(() -> {
                    ProcurementCartItem n = new ProcurementCartItem();
                    n.setVendorId(vendorId);
                    n.setCatchAlert(alert);
                    return n;
                });
        item.setQtyKg(qtyKg);
        item.setOfferedPricePerKg(offeredPricePerKg != null ? offeredPricePerKg : alert.getAskingPricePerKg());
        return cartRepo.save(item);
    }

    @Transactional
    public void remove(Long vendorId, Long itemId) {
        ProcurementCartItem item = cartRepo.findByIdAndVendorId(itemId, vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found: " + itemId));
        cartRepo.delete(item);
    }

    @Transactional
    public void clear(Long vendorId) {
        cartRepo.deleteAllByVendorId(vendorId);
    }
}

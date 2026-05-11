package com.mermaid.app.service;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class PayoutsService {

    private final OrderRepository orderRepo;
    private final UserRepository userRepo;

    public PayoutsService(OrderRepository orderRepo, UserRepository userRepo) {
        this.orderRepo = orderRepo;
        this.userRepo = userRepo;
    }

    private OffsetDateTime startOf(LocalDate d) { return d.atStartOfDay().atOffset(ZoneOffset.UTC); }
    private OffsetDateTime endOf(LocalDate d)   { return d.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC); }

    @Transactional(readOnly = true)
    public Map<String, Object> summary(Long vendorId) {
        List<Order> all = orderRepo.findBySellerIdAndKindAndStatusIn(vendorId,
                OrderKind.RETAIL, List.of("COMPLETED"));
        BigDecimal pending = all.stream()
                .filter(o -> o.getOrderedQtyKg() != null && o.getAgreedPricePerKg() != null)
                .map(o -> o.getAgreedPricePerKg().multiply(o.getOrderedQtyKg()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("pendingTotal", pending.doubleValue());
        m.put("paidTotal", 0.0);
        return m;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> ledger(Long vendorId, LocalDate from, LocalDate to) {
        if (from.isAfter(to)) throw new IllegalArgumentException("from must not be after to");
        List<Order> orders = orderRepo.findCompletedByVendorAndKindInRange(
                vendorId, OrderKind.RETAIL, startOf(from), endOf(to));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Order o : orders) {
            BigDecimal gross = o.getOrderedQtyKg() != null && o.getAgreedPricePerKg() != null
                    ? o.getAgreedPricePerKg().multiply(o.getOrderedQtyKg())
                    : BigDecimal.ZERO;
            String buyerName = userRepo.findById(o.getBuyerId()).map(u -> u.getFullName()).orElse(null);
            String speciesName = o.getSpecies() != null ? o.getSpecies().getCommonName() : null;

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("orderId", o.getId());
            entry.put("completedAt", o.getCompletedAt());
            entry.put("buyerName", buyerName);
            entry.put("speciesName", speciesName);
            entry.put("qtyKg", o.getOrderedQtyKg() != null ? o.getOrderedQtyKg().doubleValue() : 0.0);
            entry.put("gross", gross.doubleValue());
            entry.put("fees", 0.0);
            entry.put("net", gross.doubleValue());
            entry.put("status", "PENDING_PAYOUT");
            result.add(entry);
        }
        return result;
    }
}

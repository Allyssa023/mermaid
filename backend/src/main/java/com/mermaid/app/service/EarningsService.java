package com.mermaid.app.service;

import com.mermaid.app.domain.HandoffConfirmation;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.Payment;
import com.mermaid.app.model.EarningsLedgerRow;
import com.mermaid.app.model.EarningsSummary;
import com.mermaid.app.repository.HandoffConfirmationRepository;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.repository.UserRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EarningsService {

    private final OrderRepository orderRepo;
    private final HandoffConfirmationRepository handoffRepo;
    private final PaymentRepository paymentRepo;
    private final UserRepository userRepo;

    public EarningsService(OrderRepository orderRepo,
                           HandoffConfirmationRepository handoffRepo,
                           PaymentRepository paymentRepo,
                           UserRepository userRepo) {
        this.orderRepo   = orderRepo;
        this.handoffRepo = handoffRepo;
        this.paymentRepo = paymentRepo;
        this.userRepo    = userRepo;
    }

    @Transactional(readOnly = true)
    public EarningsSummary getSummary(Long fishermanId, LocalDate from, LocalDate to) {
        List<Order> orders = queryCompletedOrders(fishermanId, from, to);

        BigDecimal totalGross      = BigDecimal.ZERO;
        BigDecimal cashCollected   = BigDecimal.ZERO;
        BigDecimal creditOutstanding = BigDecimal.ZERO;

        for (Order o : orders) {
            // Use handoff amounts (actual settled) if available, fallback to order estimate
            HandoffConfirmation handoff = handoffRepo.findByOrderId(o.getId()).orElse(null);
            BigDecimal gross;
            if (handoff != null && handoff.getTotalAmount() != null) {
                gross = handoff.getTotalAmount();
            } else {
                gross = (o.getOrderedQtyKg() != null ? o.getOrderedQtyKg() : BigDecimal.ZERO)
                    .multiply(o.getAgreedPricePerKg() != null ? o.getAgreedPricePerKg() : BigDecimal.ZERO);
            }
            totalGross = totalGross.add(gross);

            // Check payment method and status for earnings classification
            Payment payment = paymentRepo.findByOrderId(o.getId()).orElse(null);
            String method = payment != null ? payment.getMethod() : o.getPaymentMethod();
            if ("CREDIT".equals(method) && (payment == null || !"SETTLED".equals(payment.getStatus()))) {
                // Credit (utang) — outstanding until vendor settles
                creditOutstanding = creditOutstanding.add(gross);
            } else if (payment != null && ("CONFIRMED".equals(payment.getStatus()) || "SETTLED".equals(payment.getStatus()))) {
                // Cash, GCash, PayMaya, or settled credit — collected
                cashCollected = cashCollected.add(gross);
            }
        }

        EarningsSummary s = new EarningsSummary();
        s.setTotalGross(totalGross.doubleValue());
        s.setCashCollected(cashCollected.doubleValue());
        s.setCreditOutstanding(creditOutstanding.doubleValue());
        s.setOrderCount(orders.size());
        return s;
    }

    @Transactional(readOnly = true)
    public List<EarningsLedgerRow> getLedger(Long fishermanId, LocalDate from, LocalDate to) {
        return queryCompletedOrders(fishermanId, from, to).stream().map(o -> {
            HandoffConfirmation handoff = handoffRepo.findByOrderId(o.getId()).orElse(null);
            Payment payment = paymentRepo.findByOrderId(o.getId()).orElse(null);

            EarningsLedgerRow row = new EarningsLedgerRow();
            row.setOrderId(o.getId());
            row.setSpeciesName(o.getSpecies() != null ? o.getSpecies().getCommonName() : null);

            // Use handoff data for actual qty/price, fallback to order estimate
            if (handoff != null) {
                row.setQtyKg(handoff.getActualQtyKg() != null ? handoff.getActualQtyKg().doubleValue() : null);
                BigDecimal gross = handoff.getTotalAmount() != null ? handoff.getTotalAmount()
                    : handoff.getActualQtyKg().multiply(handoff.getFinalPricePerKg());
                row.setGross(gross.doubleValue());
            } else {
                row.setQtyKg(o.getOrderedQtyKg() != null ? o.getOrderedQtyKg().doubleValue() : null);
                BigDecimal gross = (o.getOrderedQtyKg() != null ? o.getOrderedQtyKg() : BigDecimal.ZERO)
                    .multiply(o.getAgreedPricePerKg() != null ? o.getAgreedPricePerKg() : BigDecimal.ZERO);
                row.setGross(gross.doubleValue());
            }

            // Payment method from Payment entity, fallback to Order field
            // For settled credits, show the actual payment method used to settle
            String method = payment != null ? payment.getMethod() : o.getPaymentMethod();
            if ("CREDIT".equals(method) && payment != null && "SETTLED".equals(payment.getStatus())) {
                method = payment.getSettledMethod() != null ? payment.getSettledMethod() : "SETTLED";
            }
            row.setPaymentMethod(method != null ? method : "—");
            row.setStatus(o.getStatus());

            if (o.getSettledAt() != null) row.setSettledAt(JsonNullable.of(o.getSettledAt()));
            row.setDate(o.getCompletedAt() != null ? o.getCompletedAt() : o.getCreatedAt());

            if (o.getBuyerId() != null) {
                userRepo.findById(o.getBuyerId())
                    .ifPresent(u -> row.setVendorName(u.getFullName()));
            }
            return row;
        }).collect(Collectors.toList());
    }

    /** Find all completed orders where this fisherman is the seller, within the date range. */
    private List<Order> queryCompletedOrders(Long fishermanId, LocalDate from, LocalDate to) {
        OffsetDateTime start = from != null
            ? from.atStartOfDay().atOffset(ZoneOffset.UTC)
            : OffsetDateTime.of(2000, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime end = to != null
            ? to.atTime(23, 59, 59).atOffset(ZoneOffset.UTC)
            : OffsetDateTime.now(ZoneOffset.UTC);

        // Include ALL completed orders for this fisherman (both PROCUREMENT and RETAIL)
        return orderRepo.findBySellerIdAndStatusAndCompletedAtBetween(
            fishermanId, "COMPLETED", start, end);
    }
}

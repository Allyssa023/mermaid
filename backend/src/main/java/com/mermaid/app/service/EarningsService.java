package com.mermaid.app.service;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.model.EarningsLedgerRow;
import com.mermaid.app.model.EarningsSummary;
import com.mermaid.app.repository.OrderRepository;
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

    public EarningsService(OrderRepository orderRepo) {
        this.orderRepo = orderRepo;
    }

    @Transactional(readOnly = true)
    public EarningsSummary getSummary(Long fishermanId, LocalDate from, LocalDate to) {
        List<Order> orders = queryOrders(fishermanId, from, to);
        BigDecimal cash   = BigDecimal.ZERO;
        BigDecimal credit = BigDecimal.ZERO;
        for (Order o : orders) {
            BigDecimal gross = o.getOrderedQtyKg().multiply(o.getAgreedPricePerKg());
            if ("CREDIT".equals(o.getPaymentMethod())) credit = credit.add(gross);
            else                                         cash   = cash.add(gross);
        }
        EarningsSummary s = new EarningsSummary();
        s.setTotalGross(cash.add(credit).doubleValue());
        s.setCashCollected(cash.doubleValue());
        s.setCreditOutstanding(credit.doubleValue());
        s.setOrderCount(orders.size());
        return s;
    }

    @Transactional(readOnly = true)
    public List<EarningsLedgerRow> getLedger(Long fishermanId, LocalDate from, LocalDate to) {
        return queryOrders(fishermanId, from, to).stream().map(o -> {
            EarningsLedgerRow row = new EarningsLedgerRow();
            row.setOrderId(o.getId());
            row.setSpeciesName(o.getSpecies() != null ? o.getSpecies().getCommonName() : null);
            row.setQtyKg(o.getOrderedQtyKg() != null ? o.getOrderedQtyKg().doubleValue() : null);
            BigDecimal gross = o.getOrderedQtyKg().multiply(o.getAgreedPricePerKg());
            row.setGross(gross.doubleValue());
            row.setPaymentMethod(o.getPaymentMethod());
            row.setStatus(o.getStatus());
            if (o.getSettledAt() != null) row.setSettledAt(JsonNullable.of(o.getSettledAt()));
            row.setDate(o.getCompletedAt());
            return row;
        }).collect(Collectors.toList());
    }

    private List<Order> queryOrders(Long fishermanId, LocalDate from, LocalDate to) {
        OffsetDateTime start = from != null
            ? from.atStartOfDay().atOffset(ZoneOffset.UTC)
            : OffsetDateTime.of(2000, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime end = to != null
            ? to.atTime(23, 59, 59).atOffset(ZoneOffset.UTC)
            : OffsetDateTime.now(ZoneOffset.UTC);
        return orderRepo.findBySellerIdAndKindAndStatusAndCompletedAtBetween(
            fishermanId, OrderKind.PROCUREMENT, "COMPLETED", start, end);
    }
}

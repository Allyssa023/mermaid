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
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final OrderRepository orderRepo;
    private final UserRepository userRepo;

    public AnalyticsService(OrderRepository orderRepo, UserRepository userRepo) {
        this.orderRepo = orderRepo;
        this.userRepo = userRepo;
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) throw new IllegalArgumentException("from must not be after to");
        if (to.toEpochDay() - from.toEpochDay() > 365) {
            throw new IllegalArgumentException("Date range cannot exceed 365 days");
        }
    }

    private OffsetDateTime startOf(LocalDate d) { return d.atStartOfDay().atOffset(ZoneOffset.UTC); }
    private OffsetDateTime endOf(LocalDate d)   { return d.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC); }

    @Transactional(readOnly = true)
    public Map<String, Object> salesSummary(Long vendorId, LocalDate from, LocalDate to) {
        validateRange(from, to);
        List<Order> orders = orderRepo.findCompletedByVendorAndKindInRange(
                vendorId, OrderKind.RETAIL, startOf(from), endOf(to));

        BigDecimal totalRevenue = orders.stream()
                .filter(o -> o.getOrderedQtyKg() != null && o.getAgreedPricePerKg() != null)
                .map(o -> o.getAgreedPricePerKg().multiply(o.getOrderedQtyKg()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalQtyKg = orders.stream()
                .filter(o -> o.getOrderedQtyKg() != null)
                .map(Order::getOrderedQtyKg)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long uniqueBuyers = orders.stream().map(Order::getBuyerId).distinct().count();
        double avgOrderValue = orders.isEmpty() ? 0
                : totalRevenue.doubleValue() / orders.size();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalOrders", orders.size());
        m.put("totalRevenue", totalRevenue.doubleValue());
        m.put("totalQtyKg", totalQtyKg.doubleValue());
        m.put("avgOrderValue", avgOrderValue);
        m.put("uniqueBuyers", (int) uniqueBuyers);
        return m;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> revenueBySpecies(Long vendorId, LocalDate from, LocalDate to) {
        validateRange(from, to);
        List<Order> orders = orderRepo.findCompletedByVendorAndKindInRange(
                vendorId, OrderKind.RETAIL, startOf(from), endOf(to));

        Map<Long, List<Order>> bySpecies = orders.stream()
                .collect(Collectors.groupingBy(o -> o.getSpecies() != null ? o.getSpecies().getId() : -1L));

        List<Map<String, Object>> result = new ArrayList<>();
        bySpecies.forEach((speciesId, ords) -> {
            if (speciesId < 0) return;
            String name = ords.get(0).getSpecies() != null ? ords.get(0).getSpecies().getCommonName() : "";
            BigDecimal rev = ords.stream()
                    .filter(o -> o.getOrderedQtyKg() != null && o.getAgreedPricePerKg() != null)
                    .map(o -> o.getAgreedPricePerKg().multiply(o.getOrderedQtyKg()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal qty = ords.stream()
                    .filter(o -> o.getOrderedQtyKg() != null)
                    .map(Order::getOrderedQtyKg)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("speciesId", speciesId);
            entry.put("speciesName", name);
            entry.put("totalRevenue", rev.doubleValue());
            entry.put("totalQtyKg", qty.doubleValue());
            result.add(entry);
        });
        result.sort(Comparator.<Map<String, Object>, Double>
                comparing(m -> -(Double) m.get("totalRevenue")));
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> procurementSpend(Long vendorId, LocalDate from, LocalDate to) {
        validateRange(from, to);
        List<Order> orders = orderRepo.findCompletedByBuyerAndKindInRange(
                vendorId, OrderKind.PROCUREMENT, startOf(from), endOf(to));

        BigDecimal totalSpend = orders.stream()
                .filter(o -> o.getOrderedQtyKg() != null && o.getAgreedPricePerKg() != null)
                .map(o -> o.getAgreedPricePerKg().multiply(o.getOrderedQtyKg()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalQtyKg = orders.stream()
                .filter(o -> o.getOrderedQtyKg() != null)
                .map(Order::getOrderedQtyKg)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalOrders", orders.size());
        m.put("totalSpend", totalSpend.doubleValue());
        m.put("totalQtyKg", totalQtyKg.doubleValue());
        return m;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> repeatBuyers(Long vendorId, LocalDate from, LocalDate to, int minOrders) {
        validateRange(from, to);
        List<Object[]> rows = orderRepo.findRepeatBuyers(vendorId, startOf(from), endOf(to), minOrders);

        // Collect all buyer IDs and batch-fetch users to avoid N+1 queries
        List<Long> buyerIds = new ArrayList<>();
        for (Object[] row : rows) {
            Long buyerId = row[0] instanceof Number n ? n.longValue() : Long.parseLong(row[0].toString());
            buyerIds.add(buyerId);
        }

        // Batch-fetch all users at once
        Map<Long, String> buyerNames = new HashMap<>();
        if (!buyerIds.isEmpty()) {
            userRepo.findAllById(buyerIds).forEach(u -> buyerNames.put(u.getId(), u.getFullName()));
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Long buyerId = row[0] instanceof Number n ? n.longValue() : Long.parseLong(row[0].toString());
            int orderCount = row[1] instanceof Number n ? n.intValue() : Integer.parseInt(row[1].toString());
            double totalSpent = row[2] instanceof Number n ? n.doubleValue() : Double.parseDouble(row[2].toString());
            OffsetDateTime lastOrder = null;
            if (row[3] != null) {
                if (row[3] instanceof java.sql.Timestamp ts) {
                    lastOrder = ts.toInstant().atOffset(ZoneOffset.UTC);
                }
            }
            String buyerName = buyerNames.get(buyerId);

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("buyerId", buyerId);
            entry.put("buyerName", buyerName);
            entry.put("orderCount", orderCount);
            entry.put("totalSpent", totalSpent);
            entry.put("lastOrder", lastOrder);
            result.add(entry);
        }
        return result;
    }
}

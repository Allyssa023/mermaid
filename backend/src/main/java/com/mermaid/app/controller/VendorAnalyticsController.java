package com.mermaid.app.controller;

import com.mermaid.app.api.VendorAnalyticsApi;
import com.mermaid.app.model.ProcurementSpend;
import com.mermaid.app.model.RepeatBuyer;
import com.mermaid.app.model.RevenueBySpecies;
import com.mermaid.app.model.SalesSummary;
import com.mermaid.app.model.VendorSpeciesSeriesItem;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.AnalyticsService;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@PreAuthorize("hasRole('VENDOR')")
public class VendorAnalyticsController implements VendorAnalyticsApi {

    private final AnalyticsService analyticsService;

    public VendorAnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @Override
    public ResponseEntity<SalesSummary> vendorSalesSummary(LocalDate from, LocalDate to) {
        Long vendorId = SecurityUtils.currentUserId();
        Map<String, Object> data = analyticsService.salesSummary(vendorId, from, to);
        SalesSummary dto = new SalesSummary(
            ((Number) data.get("totalOrders")).intValue(),
            ((Number) data.get("totalRevenue")).doubleValue(),
            ((Number) data.get("totalQtyKg")).doubleValue(),
            ((Number) data.get("avgOrderValue")).doubleValue(),
            ((Number) data.get("uniqueBuyers")).intValue()
        );
        return ResponseEntity.ok(dto);
    }

    @Override
    public ResponseEntity<List<RevenueBySpecies>> vendorRevenueBySpecies(LocalDate from, LocalDate to) {
        Long vendorId = SecurityUtils.currentUserId();
        List<Map<String, Object>> data = analyticsService.revenueBySpecies(vendorId, from, to);
        List<RevenueBySpecies> dtos = data.stream().map(m -> new RevenueBySpecies(
            ((Number) m.get("speciesId")).longValue(),
            (String) m.get("speciesName"),
            ((Number) m.get("totalRevenue")).doubleValue(),
            ((Number) m.get("totalQtyKg")).doubleValue()
        )).toList();
        return ResponseEntity.ok(dtos);
    }

    @Override
    public ResponseEntity<List<ProcurementSpend>> vendorProcurementSpend(LocalDate from, LocalDate to) {
        Long vendorId = SecurityUtils.currentUserId();
        List<Map<String, Object>> data = analyticsService.procurementSpend(vendorId, from, to);
        List<ProcurementSpend> dtos = data.stream().map(m -> new ProcurementSpend(
            ((Number) m.get("speciesId")).longValue(),
            (String) m.get("speciesName"),
            ((Number) m.get("totalOrders")).intValue(),
            ((Number) m.get("totalSpend")).doubleValue(),
            ((Number) m.get("totalQtyKg")).doubleValue()
        )).toList();
        return ResponseEntity.ok(dtos);
    }

    @Override
    public ResponseEntity<List<VendorSpeciesSeriesItem>> vendorSpeciesSeries(Integer days) {
        Long vendorId = SecurityUtils.currentUserId();
        int d = (days != null) ? days : 30;
        return ResponseEntity.ok(analyticsService.speciesSeries(vendorId, d));
    }

    @Override
    public ResponseEntity<List<RepeatBuyer>> vendorRepeatBuyers(LocalDate from, LocalDate to, Integer minOrders) {
        Long vendorId = SecurityUtils.currentUserId();
        int min = (minOrders != null) ? minOrders : 2;
        List<Map<String, Object>> data = analyticsService.repeatBuyers(vendorId, from, to, min);
        List<RepeatBuyer> dtos = data.stream().map(m -> {
            RepeatBuyer dto = new RepeatBuyer(
                ((Number) m.get("buyerId")).longValue(),
                ((Number) m.get("orderCount")).intValue(),
                ((Number) m.get("totalSpent")).doubleValue()
            );
            dto.setBuyerName(JsonNullable.of((String) m.get("buyerName")));
            dto.setLastOrder(JsonNullable.of((OffsetDateTime) m.get("lastOrder")));
            return dto;
        }).toList();
        return ResponseEntity.ok(dtos);
    }
}

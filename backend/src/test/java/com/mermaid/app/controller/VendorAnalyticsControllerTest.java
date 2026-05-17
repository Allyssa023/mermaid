package com.mermaid.app.controller;

import com.mermaid.app.service.AnalyticsService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VendorAnalyticsController.class)
@Import({VendorAnalyticsControllerTest.TestConfig.class, com.mermaid.app.config.JacksonConfig.class})
class VendorAnalyticsControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean AnalyticsService analyticsService;
    @MockitoBean JwtDecoder jwtDecoder;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asVendor(long id) {
        return jwt().jwt(b -> b.subject(String.valueOf(id)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }


    // ── GET /vendor/analytics/sales-summary ─────────────────────────

    @Test
    void salesSummary_happyPath_returns200() throws Exception {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalOrders", 5);
        data.put("totalRevenue", 4530.0);
        data.put("totalQtyKg", 33.0);
        data.put("avgOrderValue", 906.0);
        data.put("uniqueBuyers", 2);

        when(analyticsService.salesSummary(eq(10L), any(), any())).thenReturn(data);

        mockMvc.perform(get("/vendor/analytics/sales-summary")
                .param("from", "2026-04-01")
                .param("to", "2026-04-30")
                .with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.totalOrders").value(5))
               .andExpect(jsonPath("$.totalRevenue").value(4530.0))
               .andExpect(jsonPath("$.uniqueBuyers").value(2));
    }

    @Test
    void salesSummary_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/vendor/analytics/sales-summary")
                .param("from", "2026-04-01")
                .param("to", "2026-04-30"))
               .andExpect(status().isUnauthorized());
    }

    // NOTE: role enforcement via @PreAuthorize is not testable in @WebMvcTest slices
    // with this project's interface-based @RequestMapping (API-first OpenAPI pattern).
    // Enabling @EnableMethodSecurity causes CGLIB proxying that breaks route detection.
    // Role boundary tests belong in integration tests.

    @Test
    void salesSummary_badDateRange_returns400() throws Exception {
        when(analyticsService.salesSummary(eq(10L), any(), any()))
                .thenThrow(new IllegalArgumentException("Date range cannot exceed 365 days"));

        mockMvc.perform(get("/vendor/analytics/sales-summary")
                .param("from", "2025-01-01")
                .param("to", "2026-05-01")
                .with(asVendor(10L)))
               .andExpect(status().isBadRequest());
    }

    // ── GET /vendor/analytics/revenue-by-species ────────────────────

    @Test
    void revenueBySpecies_happyPath_returns200() throws Exception {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("speciesId", 1L);
        entry.put("speciesName", "Tuna");
        entry.put("totalRevenue", 2850.0);
        entry.put("totalQtyKg", 19.0);

        when(analyticsService.revenueBySpecies(eq(10L), any(), any())).thenReturn(List.of(entry));

        mockMvc.perform(get("/vendor/analytics/revenue-by-species")
                .param("from", "2026-04-01")
                .param("to", "2026-04-30")
                .with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].speciesName").value("Tuna"))
               .andExpect(jsonPath("$[0].totalRevenue").value(2850.0));
    }

    // ── GET /vendor/analytics/procurement-spend ─────────────────────

    @Test
    void procurementSpend_happyPath_returns200() throws Exception {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("speciesId", 1L);
        entry.put("speciesName", "Tuna");
        entry.put("totalOrders", 2);
        entry.put("totalSpend", 3200.0);
        entry.put("totalQtyKg", 35.0);

        when(analyticsService.procurementSpend(eq(10L), any(), any())).thenReturn(List.of(entry));

        mockMvc.perform(get("/vendor/analytics/procurement-spend")
                .param("from", "2026-04-01")
                .param("to", "2026-04-30")
                .with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].speciesName").value("Tuna"))
               .andExpect(jsonPath("$[0].totalOrders").value(2))
               .andExpect(jsonPath("$[0].totalSpend").value(3200.0));
    }

    // ── GET /vendor/analytics/repeat-buyers ─────────────────────────

    @Test
    void repeatBuyers_happyPath_returns200() throws Exception {
        Map<String, Object> buyer = new LinkedHashMap<>();
        buyer.put("buyerId", 20L);
        buyer.put("buyerName", "Maria Santos");
        buyer.put("orderCount", 3);
        buyer.put("totalSpent", 3210.0);
        buyer.put("lastOrder", OffsetDateTime.now(ZoneOffset.UTC));

        when(analyticsService.repeatBuyers(eq(10L), any(), any(), eq(2))).thenReturn(List.of(buyer));

        mockMvc.perform(get("/vendor/analytics/repeat-buyers")
                .param("from", "2026-04-01")
                .param("to", "2026-04-30")
                .with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].buyerId").value(20))
               .andExpect(jsonPath("$[0].orderCount").value(3));
    }

    @Test
    void repeatBuyers_customMinOrders() throws Exception {
        when(analyticsService.repeatBuyers(eq(10L), any(), any(), eq(5))).thenReturn(List.of());

        mockMvc.perform(get("/vendor/analytics/repeat-buyers")
                .param("from", "2026-04-01")
                .param("to", "2026-04-30")
                .param("minOrders", "5")
                .with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$").isArray());
    }
}

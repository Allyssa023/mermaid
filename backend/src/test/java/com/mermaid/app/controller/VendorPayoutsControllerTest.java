package com.mermaid.app.controller;

import com.mermaid.app.service.PayoutsService;
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

@WebMvcTest(VendorPayoutsController.class)
@Import({VendorPayoutsControllerTest.TestConfig.class, com.mermaid.app.config.JacksonConfig.class})
class VendorPayoutsControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean PayoutsService payoutsService;
    @MockitoBean JwtDecoder jwtDecoder;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asVendor(long id) {
        return jwt().jwt(b -> b.subject(String.valueOf(id)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }



    // ── GET /vendor/payouts/summary ─────────────────────────────────

    @Test
    void payoutsSummary_happyPath_returns200() throws Exception {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("pendingTotal", 3300.0);
        data.put("paidTotal", 0.0);

        when(payoutsService.summary(10L)).thenReturn(data);

        mockMvc.perform(get("/vendor/payouts/summary").with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.pendingTotal").value(3300.0))
               .andExpect(jsonPath("$.paidTotal").value(0.0));
    }

    @Test
    void payoutsSummary_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/vendor/payouts/summary"))
               .andExpect(status().isUnauthorized());
    }

    // NOTE: role enforcement via @PreAuthorize is not testable in @WebMvcTest slices
    // with this project's interface-based @RequestMapping (API-first OpenAPI pattern).
    // Role boundary tests belong in integration tests.

    // ── GET /vendor/payouts/ledger ──────────────────────────────────

    @Test
    void payoutsLedger_happyPath_returns200() throws Exception {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("orderId", 1L);
        entry.put("completedAt", OffsetDateTime.now(ZoneOffset.UTC));
        entry.put("buyerName", "Ana Cruz");
        entry.put("speciesName", "Tuna");
        entry.put("qtyKg", 10.0);
        entry.put("gross", 1500.0);
        entry.put("fees", 0.0);
        entry.put("net", 1500.0);
        entry.put("status", "PENDING_PAYOUT");

        when(payoutsService.ledger(eq(10L), any(), any())).thenReturn(List.of(entry));

        mockMvc.perform(get("/vendor/payouts/ledger")
                .param("from", "2026-04-01")
                .param("to", "2026-04-30")
                .with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].orderId").value(1))
               .andExpect(jsonPath("$[0].gross").value(1500.0))
               .andExpect(jsonPath("$[0].status").value("PENDING_PAYOUT"));
    }

    @Test
    void payoutsLedger_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/vendor/payouts/ledger")
                .param("from", "2026-04-01")
                .param("to", "2026-04-30"))
               .andExpect(status().isUnauthorized());
    }



    @Test
    void payoutsLedger_badDate_returns400() throws Exception {
        when(payoutsService.ledger(eq(10L), any(), any()))
                .thenThrow(new IllegalArgumentException("from must not be after to"));

        mockMvc.perform(get("/vendor/payouts/ledger")
                .param("from", "2026-05-01")
                .param("to", "2026-04-01")
                .with(asVendor(10L)))
               .andExpect(status().isBadRequest());
    }
}

package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.domain.InventoryLot;
import com.mermaid.app.domain.MovementReason;
import com.mermaid.app.mapper.InventoryLotMapper;
import com.mermaid.app.model.InventoryAdjustmentRequest;
import com.mermaid.app.model.InventoryLotResponse;
import com.mermaid.app.service.InventoryService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VendorInventoryController.class)
@Import({VendorInventoryControllerTest.TestConfig.class, com.mermaid.app.config.JacksonConfig.class})
class VendorInventoryControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;

    @MockitoBean InventoryService inventoryService;
    @MockitoBean InventoryLotMapper lotMapper;
    @MockitoBean JwtDecoder jwtDecoder;

    private final ObjectMapper om = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .registerModule(new JsonNullableModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asVendor(long id) {
        return jwt().jwt(b -> b.subject(String.valueOf(id)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }

    // ---- GET /api/vendor/inventory/lots ----

    @Test
    void listLots_happyPath_returns200() throws Exception {
        InventoryLot lot = new InventoryLot();
        lot.setId(1L);
        InventoryLotResponse dto = new InventoryLotResponse();
        dto.setId(1L);

        when(inventoryService.lotsForVendor(10L, null, false)).thenReturn(List.of(lot));
        when(lotMapper.toDto(lot)).thenReturn(dto);

        mockMvc.perform(get("/vendor/inventory/lots").with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void listLots_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/vendor/inventory/lots"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void listLots_withSpeciesFilter_passesFilterToService() throws Exception {
        when(inventoryService.lotsForVendor(10L, 5L, false)).thenReturn(List.of());

        mockMvc.perform(get("/vendor/inventory/lots")
                .param("speciesId", "5")
                .with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$").isArray());
    }

    // ---- POST /api/vendor/inventory/adjustments ----

    @Test
    void recordAdjustment_happyPath_returns200() throws Exception {
        InventoryAdjustmentRequest req = new InventoryAdjustmentRequest();
        req.setLotId(1L);
        req.setDeltaKg(-3.0);
        req.setReason(InventoryAdjustmentRequest.ReasonEnum.ADJUSTMENT_LOSS);

        InventoryLot updated = new InventoryLot();
        updated.setId(1L);
        InventoryLotResponse dto = new InventoryLotResponse();
        dto.setId(1L);

        when(inventoryService.recordAdjustment(eq(1L), any(BigDecimal.class),
                eq(MovementReason.ADJUSTMENT_LOSS), isNull()))
                .thenReturn(updated);
        when(lotMapper.toDto(updated)).thenReturn(dto);

        mockMvc.perform(post("/vendor/inventory/adjustments")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void recordAdjustment_insufficientStock_returns409() throws Exception {
        InventoryAdjustmentRequest req = new InventoryAdjustmentRequest();
        req.setLotId(1L);
        req.setDeltaKg(-999.0);
        req.setReason(InventoryAdjustmentRequest.ReasonEnum.ADJUSTMENT_LOSS);

        when(inventoryService.recordAdjustment(any(), any(), any(), any()))
                .thenThrow(new com.mermaid.app.exception.InsufficientStockException("insufficient"));

        mockMvc.perform(post("/vendor/inventory/adjustments")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
               .andExpect(status().isConflict());
    }

    // ---- GET /api/vendor/inventory/availability ----

    @Test
    void getAvailability_happyPath_returns200() throws Exception {
        when(inventoryService.availableKg(10L, 5L)).thenReturn(new BigDecimal("15.50"));

        mockMvc.perform(get("/vendor/inventory/availability")
                .param("speciesId", "5")
                .with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.availableKg").value(15.5));
    }
}

package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.model.*;
import com.mermaid.app.service.DemandListingService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VendorDemandListingController.class)
@Import(VendorDemandListingControllerTest.TestConfig.class)
class VendorDemandListingControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .registerModule(new JsonNullableModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @MockitoBean DemandListingService demandListingService;
    @MockitoBean JwtDecoder jwtDecoder;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asVendor(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }

    // --- list ---

    @Test
    void list_asVendor_returns200() throws Exception {
        when(demandListingService.listOwn(eq(1L), any())).thenReturn(List.of(sampleListing()));

        mockMvc.perform(get("/vendor/demand-listings")
               .with(asVendor(1L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void update_validRequest_returns200() throws Exception {
        when(demandListingService.update(eq(1L), eq(1L), any())).thenReturn(sampleListing());

        mockMvc.perform(put("/vendor/demand-listings/1")
               .with(asVendor(1L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"quantityKg\":10.0}"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void list_invalidStatusParam_returns400() throws Exception {
        mockMvc.perform(get("/vendor/demand-listings?status=BOGUS")
               .with(asVendor(1L)))
               .andExpect(status().isBadRequest());
    }

    // --- create ---

    @Test
    void create_validRequest_returns201() throws Exception {
        DemandListingCreateRequest request = new DemandListingCreateRequest(2L, 3L, 5.0, 150.0);
        when(demandListingService.create(any(), eq(1L))).thenReturn(sampleListing());

        mockMvc.perform(post("/vendor/demand-listings")
               .with(asVendor(1L))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void create_missingSpeciesId_returns400() throws Exception {
        // speciesId is required — send a body without it
        String body = "{\"locationId\":3,\"quantityKg\":5.0,\"offerPricePerKg\":150.0}";

        mockMvc.perform(post("/vendor/demand-listings")
               .with(asVendor(1L))
               .contentType(MediaType.APPLICATION_JSON)
               .content(body))
               .andExpect(status().isBadRequest());
    }

    @Test
    void create_belowMinQuantity_returns400() throws Exception {
        // quantityKg: 0.0 violates @DecimalMin("0.1")
        DemandListingCreateRequest request = new DemandListingCreateRequest(2L, 3L, 0.0, 150.0);

        mockMvc.perform(post("/vendor/demand-listings")
               .with(asVendor(1L))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isBadRequest());
    }

    // --- getById ---

    @Test
    void getById_notFound_returns404() throws Exception {
        when(demandListingService.getById(eq(99L), eq(1L)))
            .thenThrow(new com.mermaid.app.exception.ResourceNotFoundException("Demand listing not found: 99"));

        mockMvc.perform(get("/vendor/demand-listings/99")
               .with(asVendor(1L)))
               .andExpect(status().isNotFound());
    }

    @Test
    void getById_invalidIdFormat_returns400() throws Exception {
        mockMvc.perform(get("/vendor/demand-listings/abc")
               .with(asVendor(1L)))
               .andExpect(status().isBadRequest());
    }

    // --- update ---

    @Test
    void update_closedListing_returns409() throws Exception {
        when(demandListingService.update(eq(1L), eq(1L), any()))
            .thenThrow(new com.mermaid.app.exception.ListingClosedException(1L));

        mockMvc.perform(put("/vendor/demand-listings/1")
               .with(asVendor(1L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{}"))
               .andExpect(status().isConflict());
    }

    // --- delete ---

    @Test
    void delete_notFound_returns404() throws Exception {
        org.mockito.Mockito.doThrow(
            new com.mermaid.app.exception.ResourceNotFoundException("Demand listing not found: 99"))
            .when(demandListingService).delete(99L, 1L);

        mockMvc.perform(delete("/vendor/demand-listings/99")
               .with(asVendor(1L)))
               .andExpect(status().isNotFound());
    }

    @Test
    void getById_found_returns200() throws Exception {
        when(demandListingService.getById(eq(1L), eq(1L))).thenReturn(sampleListing());

        mockMvc.perform(get("/vendor/demand-listings/1")
               .with(asVendor(1L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void delete_success_returns204() throws Exception {
        mockMvc.perform(delete("/vendor/demand-listings/1")
               .with(asVendor(1L)))
               .andExpect(status().isNoContent());
    }

    // --- unauthenticated ---

    @Test
    void list_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/vendor/demand-listings"))
               .andExpect(status().isUnauthorized());
    }

    // --- validation ---

    @Test
    void create_negativePrice_returns400() throws Exception {
        DemandListingCreateRequest request = new DemandListingCreateRequest(2L, 3L, 5.0, -1.0);

        mockMvc.perform(post("/vendor/demand-listings")
               .with(asVendor(1L))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isBadRequest());
    }

    @Test
    void list_withStatusFilter_returns200() throws Exception {
        when(demandListingService.listOwn(eq(1L), eq(DemandListingStatus.OPEN)))
            .thenReturn(List.of(sampleListing()));

        mockMvc.perform(get("/vendor/demand-listings?status=OPEN")
               .with(asVendor(1L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    // --- close ---

    @Test
    void close_returns200() throws Exception {
        when(demandListingService.close(eq(1L), eq(1L))).thenReturn(sampleListing());

        mockMvc.perform(post("/vendor/demand-listings/1/close")
               .with(asVendor(1L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void close_notFound_returns404() throws Exception {
        when(demandListingService.close(eq(99L), eq(1L)))
            .thenThrow(new com.mermaid.app.exception.ResourceNotFoundException("Demand listing not found: 99"));

        mockMvc.perform(post("/vendor/demand-listings/99/close")
               .with(asVendor(1L)))
               .andExpect(status().isNotFound());
    }

    // --- helper ---

    private com.mermaid.app.model.DemandListing sampleListing() {
        return new com.mermaid.app.model.DemandListing(
            1L, 1L,
            new com.mermaid.app.model.FishSpecies(2L, "Bangus", true),
            new com.mermaid.app.model.MarketLocation(3L, "Carbon Market", "Cebu City", true),
            5.0, 150.0, DemandListingStatus.OPEN, OffsetDateTime.now());
    }
}

package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.domain.StorefrontListing;
import com.mermaid.app.domain.StorefrontListingStatus;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.StorefrontListingMapper;
import com.mermaid.app.model.StorefrontListingRequest;
import com.mermaid.app.model.StorefrontListingResponse;
import com.mermaid.app.service.InventoryService;
import com.mermaid.app.service.StorefrontListingService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;
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

@WebMvcTest(VendorStorefrontController.class)
@Import({VendorStorefrontControllerTest.TestConfig.class, com.mermaid.app.config.JacksonConfig.class})
class VendorStorefrontControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;

    @MockitoBean StorefrontListingService service;
    @MockitoBean StorefrontListingMapper mapper;
    @MockitoBean InventoryService inventoryService;
    @MockitoBean JwtDecoder jwtDecoder;

    private final ObjectMapper om = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .registerModule(new JsonNullableModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asVendor(long id) {
        return jwt().jwt(b -> b.subject(String.valueOf(id)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }

    // ---- GET /vendor/storefront/listings ----

    @Test
    void listListings_happyPath_returns200() throws Exception {
        StorefrontListing sl = listing(1L, 10L, 5L);
        StorefrontListingResponse dto = responseDto(1L);

        when(service.listForVendor(10L)).thenReturn(List.of(sl));
        when(inventoryService.effectiveAvailableKg(any())).thenReturn(bd("20.00"));
        when(inventoryService.availableKg(10L, 5L)).thenReturn(bd("20.00"));
        when(mapper.toDto(eq(sl), any(BigDecimal.class))).thenReturn(dto);

        mockMvc.perform(get("/vendor/storefront/listings").with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void listListings_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/vendor/storefront/listings"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void unpublishListing_happyPath_returns200() throws Exception {
        StorefrontListing unpublished = listing(1L, 10L, 5L);
        unpublished.setStatus(StorefrontListingStatus.UNPUBLISHED);
        StorefrontListingResponse dto = responseDto(1L);
        dto.setStatus(StorefrontListingResponse.StatusEnum.UNPUBLISHED);

        when(service.unpublish(10L, 1L)).thenReturn(unpublished);
        when(inventoryService.effectiveAvailableKg(any())).thenReturn(bd("20.00"));
        when(inventoryService.availableKg(10L, 5L)).thenReturn(bd("20.00"));
        when(mapper.toDto(eq(unpublished), any(BigDecimal.class))).thenReturn(dto);

        mockMvc.perform(post("/vendor/storefront/listings/1/unpublish").with(asVendor(10L)))
               .andExpect(status().isOk());
    }

    // ---- POST /vendor/storefront/listings ----

    @Test
    void createListing_happyPath_returns201() throws Exception {
        StorefrontListingRequest req = new StorefrontListingRequest();
        req.setSpeciesId(5L);
        req.setTitle("Fresh Bangus");
        req.setPricePerKg(200.0);
        req.setMinQtyKg(0.5);
        req.setLotIds(List.of(1L));
        req.setPhotoEyes("http://example.com/eyes.jpg");
        req.setPhotoGills("http://example.com/gills.jpg");
        req.setPhotoScales("http://example.com/scales.jpg");
        req.setPhotoBelly("http://example.com/belly.jpg");
        req.setPhotoFlesh("http://example.com/flesh.jpg");

        StorefrontListing saved = listing(100L, 10L, 5L);
        StorefrontListingResponse dto = responseDto(100L);

        when(service.create(eq(10L), any(), eq(List.of(1L)))).thenReturn(saved);
        when(inventoryService.effectiveAvailableKg(any())).thenReturn(bd("20.00"));
        when(inventoryService.availableKg(10L, 5L)).thenReturn(bd("20.00"));
        when(mapper.toDto(eq(saved), any(BigDecimal.class))).thenReturn(dto);

        mockMvc.perform(post("/vendor/storefront/listings")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.id").value(100));
    }

    @Test
    void createListing_insufficientStock_returns400() throws Exception {
        StorefrontListingRequest req = new StorefrontListingRequest();
        req.setSpeciesId(5L);
        req.setTitle("Fresh Bangus");
        req.setPricePerKg(200.0);
        req.setMinQtyKg(0.5);
        req.setLotIds(List.of(1L));
        req.setPhotoEyes("http://example.com/eyes.jpg");
        req.setPhotoGills("http://example.com/gills.jpg");
        req.setPhotoScales("http://example.com/scales.jpg");
        req.setPhotoBelly("http://example.com/belly.jpg");
        req.setPhotoFlesh("http://example.com/flesh.jpg");

        when(service.create(any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Lot 1 has no remaining stock"));

        mockMvc.perform(post("/vendor/storefront/listings")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
               .andExpect(status().isBadRequest());
    }

    // ---- POST /vendor/storefront/listings/{id}/publish ----

    @Test
    void publishListing_happyPath_returns200() throws Exception {
        StorefrontListing published = listing(1L, 10L, 5L);
        published.setStatus(StorefrontListingStatus.PUBLISHED);
        StorefrontListingResponse dto = responseDto(1L);

        when(service.publish(10L, 1L)).thenReturn(published);
        when(inventoryService.effectiveAvailableKg(any())).thenReturn(bd("20.00"));
        when(inventoryService.availableKg(10L, 5L)).thenReturn(bd("20.00"));
        when(mapper.toDto(eq(published), any(BigDecimal.class))).thenReturn(dto);

        mockMvc.perform(post("/vendor/storefront/listings/1/publish").with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void publishListing_zeroStock_returns400() throws Exception {
        when(service.publish(10L, 1L))
                .thenThrow(new IllegalArgumentException("Cannot publish listing with zero available stock"));

        mockMvc.perform(post("/vendor/storefront/listings/1/publish").with(asVendor(10L)))
               .andExpect(status().isBadRequest());
    }

    @Test
    void publishListing_wrongVendor_returns404() throws Exception {
        when(service.publish(10L, 1L))
                .thenThrow(new ResourceNotFoundException("Listing not found: 1"));

        mockMvc.perform(post("/vendor/storefront/listings/1/publish").with(asVendor(10L)))
               .andExpect(status().isNotFound());
    }

    // ---- DELETE /vendor/storefront/listings/{id} ----

    @Test
    void deleteListing_happyPath_returns204() throws Exception {
        mockMvc.perform(delete("/vendor/storefront/listings/1").with(asVendor(10L)))
               .andExpect(status().isNoContent());
    }

    // ---- helpers ----

    private static BigDecimal bd(String v) { return new BigDecimal(v); }

    private static StorefrontListing listing(Long id, Long vendorId, Long speciesId) {
        StorefrontListing l = new StorefrontListing();
        l.setId(id);
        l.setVendorId(vendorId);
        l.setSpeciesId(speciesId);
        l.setTitle("Test");
        l.setPricePerKg(bd("200.00"));
        l.setMinQtyKg(bd("0.5"));
        l.setStatus(StorefrontListingStatus.DRAFT);
        return l;
    }

    private static StorefrontListingResponse responseDto(Long id) {
        StorefrontListingResponse r = new StorefrontListingResponse();
        r.setId(id);
        r.setVendorId(10L);
        r.setSpeciesId(5L);
        r.setTitle("Test");
        r.setStatus(StorefrontListingResponse.StatusEnum.DRAFT);
        return r;
    }
}

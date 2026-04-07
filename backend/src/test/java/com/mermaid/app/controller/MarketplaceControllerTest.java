package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.model.*;
import com.mermaid.app.service.MarketplaceService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.beans.factory.annotation.Autowired;
import com.mermaid.app.config.JacksonConfig;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;

import org.springframework.http.MediaType;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MarketplaceController.class)
@Import({MarketplaceControllerTest.TestConfig.class, JacksonConfig.class})
class MarketplaceControllerTest {

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

    @MockitoBean MarketplaceService marketplaceService;
    @MockitoBean com.mermaid.app.service.ListingInterestService interestService;
    @MockitoBean JwtDecoder jwtDecoder;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asFisherman(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_FISHERMAN"));
    }

    // --- browse ---

    @Test
    void browse_noFilters_returns200() throws Exception {
        when(marketplaceService.browseListings(isNull(), isNull(), isNull(), isNull()))
            .thenReturn(List.of(sampleListing()));

        mockMvc.perform(get("/marketplace/listings")
               .with(asFisherman(1L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void browse_withSpeciesFilter_returns200() throws Exception {
        when(marketplaceService.browseListings(2L, null, null, null))
            .thenReturn(List.of(sampleListing()));

        mockMvc.perform(get("/marketplace/listings?speciesId=2")
               .with(asFisherman(1L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void browse_withPriceFilter_returns200() throws Exception {
        when(marketplaceService.browseListings(isNull(), isNull(), eq(100.0), eq(200.0)))
            .thenReturn(List.of(sampleListing()));

        mockMvc.perform(get("/marketplace/listings?minOfferPrice=100.0&maxOfferPrice=200.0")
               .with(asFisherman(1L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void browse_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/marketplace/listings"))
               .andExpect(status().isUnauthorized());
    }

    // NOTE: role enforcement via @PreAuthorize is not testable in @WebMvcTest slices
    // with this project's interface-based @RequestMapping (API-first OpenAPI pattern).
    // Enabling @EnableMethodSecurity causes CGLIB proxying that breaks route detection.
    // Role boundary tests belong in integration tests.

    // --- lookup ---

    @Test
    void lookup_withSpeciesId_returns200() throws Exception {
        when(marketplaceService.lookupOffers(2L, null))
            .thenReturn(List.of(sampleOfferLookupItem()));

        mockMvc.perform(get("/marketplace/offers/lookup?speciesId=2")
               .with(asFisherman(1L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].listingId").value(1));
    }

    @Test
    void lookup_missingSpeciesId_returns400() throws Exception {
        mockMvc.perform(get("/marketplace/offers/lookup")
               .with(asFisherman(1L)))
               .andExpect(status().isBadRequest())
               .andExpect(jsonPath("$.status").value(400))
               .andExpect(jsonPath("$.message").value("Required parameter 'speciesId' is missing"));
    }

    // --- expressInterest ---

    @Test
    void expressInterest_validRequest_returns201() throws Exception {
        when(interestService.express(eq(1L), eq(42L), eq("I can bring 40kg")))
            .thenReturn(sampleInterest());

        mockMvc.perform(post("/marketplace/listings/1/interest")
               .with(asFisherman(42L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"message\":\"I can bring 40kg\"}"))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void expressInterest_listingNotFound_returns404() throws Exception {
        when(interestService.express(anyLong(), anyLong(), anyString()))
            .thenThrow(new com.mermaid.app.exception.ResourceNotFoundException("not found"));

        mockMvc.perform(post("/marketplace/listings/99/interest")
               .with(asFisherman(1L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"message\":\"hello\"}"))
               .andExpect(status().isNotFound());
    }

    @Test
    void expressInterest_duplicate_returns409WithCode() throws Exception {
        when(interestService.express(anyLong(), anyLong(), anyString()))
            .thenThrow(new com.mermaid.app.exception.DuplicateInterestException(1L));

        mockMvc.perform(post("/marketplace/listings/1/interest")
               .with(asFisherman(1L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"message\":\"hello\"}"))
               .andExpect(status().isConflict())
               .andExpect(jsonPath("$.code").value("DUPLICATE_INTEREST"));
    }

    @Test
    void expressInterest_listingClosed_returns409WithCode() throws Exception {
        when(interestService.express(anyLong(), anyLong(), anyString()))
            .thenThrow(new com.mermaid.app.exception.ListingClosedException(1L));

        mockMvc.perform(post("/marketplace/listings/1/interest")
               .with(asFisherman(1L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"message\":\"hello\"}"))
               .andExpect(status().isConflict())
               .andExpect(jsonPath("$.code").value("LISTING_CLOSED"));
    }

    @Test
    void getMyInterests_returns200() throws Exception {
        when(interestService.myInterests(42L))
            .thenReturn(List.of(sampleInterestDetail()));

        mockMvc.perform(get("/marketplace/my-interests")
               .with(asFisherman(42L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(10));
    }

    // --- helpers ---

    private com.mermaid.app.model.DemandListing sampleListing() {
        return new com.mermaid.app.model.DemandListing(
            1L, 1L,
            new com.mermaid.app.model.FishSpecies(2L, "Bangus", true),
            new com.mermaid.app.model.MarketLocation(3L, "Carbon Market", "Cebu City", true),
            5.0, 150.0, DemandListingStatus.OPEN, OffsetDateTime.now());
    }

    private com.mermaid.app.model.OfferLookupItem sampleOfferLookupItem() {
        return new com.mermaid.app.model.OfferLookupItem(
            1L, 1L, "Rosario",
            new com.mermaid.app.model.MarketLocation(3L, "Carbon Market", "Cebu City", true),
            150.0, 5.0);
    }

    private com.mermaid.app.model.ListingInterest sampleInterest() {
        com.mermaid.app.model.ListingInterest i = new com.mermaid.app.model.ListingInterest();
        i.setId(10L);
        i.setListingId(1L);
        i.setFishermanId(42L);
        i.setMessage("I can bring 40kg");
        i.setCreatedAt(OffsetDateTime.now());
        return i;
    }

    private com.mermaid.app.model.ListingInterestDetail sampleInterestDetail() {
        com.mermaid.app.model.ListingInterestDetail d = new com.mermaid.app.model.ListingInterestDetail();
        d.setId(10L);
        d.setMessage("I can bring 40kg");
        d.setCreatedAt(OffsetDateTime.now());
        d.setListing(sampleListing());
        return d;
    }
}

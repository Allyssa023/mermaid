package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.config.JacksonConfig;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.BuyerListingDetail;
import com.mermaid.app.model.BuyerVendorProfile;
import com.mermaid.app.model.PagedStorefrontListings;
import com.mermaid.app.model.StorefrontListingSummary;
import com.mermaid.app.service.MarketplaceService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BuyerMarketplaceController.class)
@Import({BuyerMarketplaceControllerTest.TestConfig.class, JacksonConfig.class})
class BuyerMarketplaceControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;

    @MockitoBean MarketplaceService marketplaceService;
    @MockitoBean JwtDecoder jwtDecoder;

    // --- browse ---

    @Test
    void browse_returnsPageEnvelope() throws Exception {
        when(marketplaceService.searchStorefrontListings(any(), any(), any(), any(), any()))
            .thenReturn(samplePage(List.of(sampleSummary())));

        mockMvc.perform(get("/buyer/marketplace/listings").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.content[0].id").value(1))
               .andExpect(jsonPath("$.page").value(0))
               .andExpect(jsonPath("$.size").value(20))
               .andExpect(jsonPath("$.totalElements").value(1))
               .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void browse_withFilters_passedThroughToService() throws Exception {
        when(marketplaceService.searchStorefrontListings(any(), any(), any(), any(), any()))
            .thenReturn(samplePage(List.of()));

        mockMvc.perform(get("/buyer/marketplace/listings")
                .with(jwt())
                .param("q", "tuna")
                .param("speciesId", "2")
                .param("vendorId", "5")
                .param("page", "1")
                .param("size", "10"))
            .andExpect(status().isOk());

        verify(marketplaceService).searchStorefrontListings(
                eq("tuna"), eq(2L), eq(5L), eq(1), eq(10));
    }

    @Test
    void browse_emptyResults_returns200WithEmptyContent() throws Exception {
        when(marketplaceService.searchStorefrontListings(any(), any(), any(), any(), any()))
            .thenReturn(samplePage(List.of()));

        mockMvc.perform(get("/buyer/marketplace/listings").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.content").isArray())
               .andExpect(jsonPath("$.content").isEmpty())
               .andExpect(jsonPath("$.totalElements").value(0));
    }

    // --- detail ---

    @Test
    void detail_existingListing_returns200WithVendorAndRelated() throws Exception {
        StorefrontListingSummary main = sampleSummary();
        BuyerVendorProfile vendor = new BuyerVendorProfile(1L, "Marina Seafoods");
        BuyerListingDetail detail = new BuyerListingDetail(main, vendor, List.of(sampleSummary()));

        when(marketplaceService.getStorefrontListingDetail(1L)).thenReturn(detail);

        mockMvc.perform(get("/buyer/marketplace/listings/1").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.listing.id").value(1))
                .andExpect(jsonPath("$.vendor.fullName").value("Marina Seafoods"))
                .andExpect(jsonPath("$.relatedListings").isArray())
                .andExpect(jsonPath("$.relatedListings[0].id").value(1));
    }

    @Test
    void detail_notFound_returns404() throws Exception {
        when(marketplaceService.getStorefrontListingDetail(99L))
                .thenThrow(new ResourceNotFoundException("Listing not found: 99"));

        mockMvc.perform(get("/buyer/marketplace/listings/99").with(jwt()))
                .andExpect(status().isNotFound());
    }

    // --- helpers ---

    private StorefrontListingSummary sampleSummary() {
        return new StorefrontListingSummary(
                1L, 10L, 2L, "Fresh Bangus",
                150.0, 20.0,
                StorefrontListingSummary.StatusEnum.PUBLISHED,
                OffsetDateTime.now());
    }

    private PagedStorefrontListings samplePage(List<StorefrontListingSummary> content) {
        return new PagedStorefrontListings(content, 0, 20, (long) content.size(), content.isEmpty() ? 0 : 1);
    }
}

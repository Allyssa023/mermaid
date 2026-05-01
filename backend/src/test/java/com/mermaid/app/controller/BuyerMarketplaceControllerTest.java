package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.config.JacksonConfig;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.BuyerListingDetail;
import com.mermaid.app.model.BuyerListingSort;
import com.mermaid.app.model.BuyerVendorProfile;
import com.mermaid.app.model.DemandListing;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.model.PagedDemandListings;
import com.mermaid.app.service.MarketplaceService;
import com.mermaid.app.service.MarketplaceService.BuyerMarketplaceFilter;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .registerModule(new JsonNullableModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @MockitoBean MarketplaceService marketplaceService;
    @MockitoBean JwtDecoder jwtDecoder;

    // --- browse ---

    @Test
    void browse_returnsPageEnvelope() throws Exception {
        when(marketplaceService.searchListings(any()))
            .thenReturn(samplePage(List.of(sampleListing())));

        mockMvc.perform(get("/buyer/marketplace/listings").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.content[0].id").value(1))
               .andExpect(jsonPath("$.page").value(0))
               .andExpect(jsonPath("$.size").value(20))
               .andExpect(jsonPath("$.totalElements").value(1))
               .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void browse_withAllFilters_passedThroughToService() throws Exception {
        when(marketplaceService.searchListings(any())).thenReturn(samplePage(List.of()));

        mockMvc.perform(get("/buyer/marketplace/listings")
                .with(jwt())
                .param("q", "tuna")
                .param("speciesId", "2")
                .param("locationId", "3")
                .param("minOfferPrice", "100")
                .param("maxOfferPrice", "500")
                .param("lat", "14.5")
                .param("lng", "120.9")
                .param("maxDistanceKm", "25")
                .param("sort", "DISTANCE_ASC")
                .param("page", "1")
                .param("size", "10"))
            .andExpect(status().isOk());

        ArgumentCaptor<BuyerMarketplaceFilter> captor = ArgumentCaptor.forClass(BuyerMarketplaceFilter.class);
        verify(marketplaceService).searchListings(captor.capture());
        BuyerMarketplaceFilter f = captor.getValue();
        assertThat(f.q()).isEqualTo("tuna");
        assertThat(f.speciesId()).isEqualTo(2L);
        assertThat(f.locationId()).isEqualTo(3L);
        assertThat(f.minOfferPrice()).isEqualTo(100.0);
        assertThat(f.maxOfferPrice()).isEqualTo(500.0);
        assertThat(f.lat()).isEqualTo(14.5);
        assertThat(f.lng()).isEqualTo(120.9);
        assertThat(f.maxDistanceKm()).isEqualTo(25.0);
        assertThat(f.sort()).isEqualTo(BuyerListingSort.DISTANCE_ASC);
        assertThat(f.page()).isEqualTo(1);
        assertThat(f.size()).isEqualTo(10);
    }

    @Test
    void browse_emptyResults_returns200WithEmptyContent() throws Exception {
        when(marketplaceService.searchListings(any())).thenReturn(samplePage(List.of()));

        mockMvc.perform(get("/buyer/marketplace/listings").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.content").isArray())
               .andExpect(jsonPath("$.content").isEmpty())
               .andExpect(jsonPath("$.totalElements").value(0));
    }

    // --- detail ---

    @Test
    void detail_existingListing_returns200WithVendorAndRelated() throws Exception {
        DemandListing main = sampleListing();
        BuyerVendorProfile vendor = new BuyerVendorProfile(1L, "Marina Seafoods");
        BuyerListingDetail detail = new BuyerListingDetail(
                main, vendor, List.of(), List.of(sampleListing()));

        when(marketplaceService.getListingDetail(1L)).thenReturn(detail);

        mockMvc.perform(get("/buyer/marketplace/listings/1").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.listing.id").value(1))
                .andExpect(jsonPath("$.vendor.fullName").value("Marina Seafoods"))
                .andExpect(jsonPath("$.photoUrls").isArray())
                .andExpect(jsonPath("$.relatedListings").isArray())
                .andExpect(jsonPath("$.relatedListings[0].id").value(1));
    }

    @Test
    void detail_notFound_returns404() throws Exception {
        when(marketplaceService.getListingDetail(99L))
                .thenThrow(new ResourceNotFoundException("Listing not found: 99"));

        mockMvc.perform(get("/buyer/marketplace/listings/99").with(jwt()))
                .andExpect(status().isNotFound());
    }

    // --- helpers ---

    private DemandListing sampleListing() {
        return new DemandListing(
            1L, 1L,
            new com.mermaid.app.model.FishSpecies(2L, "Bangus", true),
            new com.mermaid.app.model.MarketLocation(3L, "Carbon Market", "Cebu City", true),
            5.0, 150.0, DemandListingStatus.OPEN, OffsetDateTime.now());
    }

    private PagedDemandListings samplePage(List<DemandListing> content) {
        return new PagedDemandListings(content, 0, 20, (long) content.size(), content.isEmpty() ? 0 : 1);
    }
}

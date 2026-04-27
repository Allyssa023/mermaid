package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.config.JacksonConfig;
import com.mermaid.app.model.DemandListing;
import com.mermaid.app.model.DemandListingStatus;
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

import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
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
    void browse_noAuth_returns200() throws Exception {
        when(marketplaceService.browseListings(isNull(), isNull(), isNull(), isNull()))
            .thenReturn(List.of(sampleListing()));

        mockMvc.perform(get("/buyer/marketplace/listings"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void browse_withSpeciesFilter_returns200() throws Exception {
        when(marketplaceService.browseListings(2L, null, null, null))
            .thenReturn(List.of(sampleListing()));

        mockMvc.perform(get("/buyer/marketplace/listings?speciesId=2"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void browse_emptyResults_returns200WithEmptyArray() throws Exception {
        when(marketplaceService.browseListings(isNull(), isNull(), isNull(), isNull()))
            .thenReturn(List.of());

        mockMvc.perform(get("/buyer/marketplace/listings"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$").isArray())
               .andExpect(jsonPath("$").isEmpty());
    }

    // --- helpers ---

    private DemandListing sampleListing() {
        return new DemandListing(
            1L, 1L,
            new com.mermaid.app.model.FishSpecies(2L, "Bangus", true),
            new com.mermaid.app.model.MarketLocation(3L, "Carbon Market", "Cebu City", true),
            5.0, 150.0, DemandListingStatus.OPEN, OffsetDateTime.now());
    }
}

package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.config.JacksonConfig;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.VendorWatchlist;
import com.mermaid.app.service.WatchlistService;
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
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VendorWatchlistController.class)
@Import({VendorWatchlistControllerTest.TestConfig.class, JacksonConfig.class})
class VendorWatchlistControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean WatchlistService watchlistService;
    @MockitoBean JwtDecoder jwtDecoder;

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .registerModule(new JsonNullableModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static RequestPostProcessor asVendor(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }

    private VendorWatchlist watchlistEntry() {
        VendorWatchlist w = new VendorWatchlist();
        w.setId(1L);
        w.setVendorId(10L);
        FishSpecies s = new FishSpecies();
        s.setId(5L);
        s.setCommonName("Tuna");
        w.setSpecies(s);
        w.setCreatedAt(OffsetDateTime.now());
        return w;
    }

    @Test
    void listWatchlist_vendor_returns200() throws Exception {
        when(watchlistService.listForVendor(anyLong())).thenReturn(List.of(watchlistEntry()));

        mockMvc.perform(get("/vendor/watchlist").with(asVendor(10L)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(1))
            .andExpect(jsonPath("$[0].speciesName").value("Tuna"));
    }

    @Test
    void listWatchlist_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/vendor/watchlist"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void addWatchlist_validSpecies_returns200() throws Exception {
        VendorWatchlist saved = watchlistEntry();
        when(watchlistService.add(anyLong(), eq(5L), eq(null), eq(null))).thenReturn(saved);

        String body = objectMapper.writeValueAsString(
            java.util.Map.of("speciesId", 5));

        mockMvc.perform(post("/vendor/watchlist")
            .with(asVendor(10L))
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void deleteWatchlist_vendor_returns204() throws Exception {
        mockMvc.perform(delete("/vendor/watchlist/1").with(asVendor(10L)))
            .andExpect(status().isNoContent());
    }
}

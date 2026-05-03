package com.mermaid.app.controller;

import com.mermaid.app.config.JacksonConfig;
import com.mermaid.app.model.AddFavoriteRequest;
import com.mermaid.app.model.BuyerFavorite;
import com.mermaid.app.model.FavoriteTargetType;
import com.mermaid.app.service.FavoriteService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BuyerFavoriteController.class)
@Import({BuyerFavoriteControllerTest.TestConfig.class, JacksonConfig.class})
class BuyerFavoriteControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;

    @MockitoBean FavoriteService favoriteService;
    @MockitoBean JwtDecoder jwtDecoder;

    private static RequestPostProcessor asBuyer(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_BUYER"));
    }

    private BuyerFavorite sample() {
        return new BuyerFavorite(10L, FavoriteTargetType.LISTING, 42L, OffsetDateTime.now());
    }

    @Test
    void list_returns200() throws Exception {
        when(favoriteService.list(eq(1L), eq(null))).thenReturn(List.of(sample()));

        mockMvc.perform(get("/buyer/favorites").with(asBuyer(1L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].targetType").value("LISTING"))
                .andExpect(jsonPath("$[0].targetId").value(42));
    }

    @Test
    void list_filteredByType() throws Exception {
        when(favoriteService.list(eq(1L), eq(FavoriteTargetType.VENDOR))).thenReturn(List.of());

        mockMvc.perform(get("/buyer/favorites?type=VENDOR").with(asBuyer(1L)))
                .andExpect(status().isOk());
    }

    @Test
    void add_returns201() throws Exception {
        when(favoriteService.add(eq(1L), any(AddFavoriteRequest.class))).thenReturn(sample());

        mockMvc.perform(post("/buyer/favorites")
                .with(asBuyer(1L)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"targetType\":\"LISTING\",\"targetId\":42}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.targetId").value(42));
    }

    @Test
    void removeById_returns204() throws Exception {
        mockMvc.perform(delete("/buyer/favorites/10")
                .with(asBuyer(1L)).with(csrf()))
                .andExpect(status().isNoContent());
        verify(favoriteService).removeById(1L, 10L);
    }

    @Test
    void removeByTarget_returns204() throws Exception {
        mockMvc.perform(delete("/buyer/favorites/by-target?targetType=VENDOR&targetId=99")
                .with(asBuyer(1L)).with(csrf()))
                .andExpect(status().isNoContent());
        verify(favoriteService).removeByTarget(1L, FavoriteTargetType.VENDOR, 99L);
    }
}

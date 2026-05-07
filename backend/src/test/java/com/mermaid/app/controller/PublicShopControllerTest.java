package com.mermaid.app.controller;

import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.PublicShopView;
import com.mermaid.app.model.ShopProfile;
import com.mermaid.app.service.ShopProfileService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PublicShopController.class)
@Import({PublicShopControllerTest.TestConfig.class, com.mermaid.app.config.JacksonConfig.class})
class PublicShopControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean ShopProfileService shopProfileService;
    @MockitoBean JwtDecoder jwtDecoder;
    @MockitoBean com.mermaid.app.security.OAuth2AuthenticationSuccessHandler oAuth2SuccessHandler;

    @Test
    @WithMockUser
    void getPublicShop_bySlug_returns200() throws Exception {
        ShopProfile profile = new ShopProfile(1L, 5L, "rosarios-catch", "Rosario's Catch",
                OffsetDateTime.now(), OffsetDateTime.now());
        PublicShopView view = new PublicShopView(profile);
        view.setListings(List.of());
        view.setRecentReviews(List.of());
        view.setReviewCount(0);

        when(shopProfileService.getPublic("rosarios-catch")).thenReturn(view);

        mockMvc.perform(get("/public/shop/rosarios-catch"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.profile.slug").value("rosarios-catch"))
               .andExpect(jsonPath("$.profile.displayName").value("Rosario's Catch"));
    }

    @Test
    @WithMockUser
    void getPublicShop_notFound_returns404() throws Exception {
        when(shopProfileService.getPublic("no-such-shop"))
                .thenThrow(new ResourceNotFoundException("Shop not found: no-such-shop"));

        mockMvc.perform(get("/public/shop/no-such-shop"))
               .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void getPublicShop_byVendorId_returns200() throws Exception {
        ShopProfile profile = new ShopProfile(1L, 5L, "vendor-5", "Vendor 5",
                OffsetDateTime.now(), OffsetDateTime.now());
        PublicShopView view = new PublicShopView(profile);
        view.setListings(List.of());
        view.setRecentReviews(List.of());
        view.setReviewCount(0);

        when(shopProfileService.getPublic("5")).thenReturn(view);

        mockMvc.perform(get("/public/shop/5"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.profile.vendorId").value(5));
    }
}

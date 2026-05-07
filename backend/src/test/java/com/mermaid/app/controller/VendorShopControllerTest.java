package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.model.ReviewWithReply;
import com.mermaid.app.model.ShopProfile;
import com.mermaid.app.service.ReviewService;
import com.mermaid.app.service.ShopProfileService;
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

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VendorShopController.class)
@Import({VendorShopControllerTest.TestConfig.class, com.mermaid.app.config.JacksonConfig.class})
class VendorShopControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean ShopProfileService shopProfileService;
    @MockitoBean ReviewService reviewService;
    @MockitoBean JwtDecoder jwtDecoder;

    private final ObjectMapper om = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .registerModule(new JsonNullableModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asVendor(long id) {
        return jwt().jwt(b -> b.subject(String.valueOf(id)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }

    @Test
    void getProfile_returnsProfile() throws Exception {
        ShopProfile profile = shopProfile(10L, 5L, "vendor-5");
        when(shopProfileService.getMine(5L)).thenReturn(profile);

        mockMvc.perform(get("/vendor/shop/profile").with(asVendor(5L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(10))
               .andExpect(jsonPath("$.slug").value("vendor-5"));
    }

    @Test
    void getProfile_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/vendor/shop/profile"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void updateProfile_happyPath_returns200() throws Exception {
        ShopProfile profile = shopProfile(10L, 5L, "my-shop");
        when(shopProfileService.updateMine(eq(5L), any())).thenReturn(profile);

        String body = om.writeValueAsString(Map.of("slug", "my-shop", "displayName", "My Shop"));
        mockMvc.perform(put("/vendor/shop/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .with(asVendor(5L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.slug").value("my-shop"));
    }

    @Test
    void updateProfile_slugTaken_returns400() throws Exception {
        when(shopProfileService.updateMine(eq(5L), any()))
                .thenThrow(new IllegalArgumentException("Slug 'taken' is already taken"));

        String body = om.writeValueAsString(Map.of("slug", "taken"));
        mockMvc.perform(put("/vendor/shop/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .with(asVendor(5L)))
               .andExpect(status().isBadRequest());
    }

    @Test
    void listReviews_returnsReviews() throws Exception {
        ReviewWithReply r = reviewWithReply(1L, 5L);
        when(reviewService.listForVendorWithReply(eq(5L), anyInt(), anyInt())).thenReturn(List.of(r));

        mockMvc.perform(get("/vendor/reviews").with(asVendor(5L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void replyToReview_happyPath_returns200() throws Exception {
        ReviewWithReply r = reviewWithReply(1L, 5L);
        when(reviewService.reply(eq(5L), eq(1L), any())).thenReturn(r);

        String body = om.writeValueAsString(Map.of("text", "Thank you!"));
        mockMvc.perform(post("/vendor/reviews/1/reply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .with(asVendor(5L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(1));
    }

    private static ShopProfile shopProfile(Long id, Long vendorId, String slug) {
        return new ShopProfile(id, vendorId, slug, "Test Shop", OffsetDateTime.now(), OffsetDateTime.now());
    }

    private static ReviewWithReply reviewWithReply(Long id, Long vendorId) {
        ReviewWithReply r = new ReviewWithReply(id, 100L, 99L, 5, OffsetDateTime.now());
        return r;
    }
}

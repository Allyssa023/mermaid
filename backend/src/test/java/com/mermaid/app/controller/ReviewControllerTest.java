package com.mermaid.app.controller;

import com.mermaid.app.config.JacksonConfig;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.CreateReviewRequest;
import com.mermaid.app.model.BuyerVendorProfile;
import com.mermaid.app.model.PagedReviews;
import com.mermaid.app.model.Review;
import com.mermaid.app.model.VendorStorefront;
import com.mermaid.app.service.ReviewService;
import com.mermaid.app.service.VendorStorefrontService;
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
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReviewController.class)
@Import({ReviewControllerTest.TestConfig.class, JacksonConfig.class})
class ReviewControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;

    @MockitoBean ReviewService reviewService;
    @MockitoBean VendorStorefrontService storefrontService;
    @MockitoBean JwtDecoder jwtDecoder;

    private static RequestPostProcessor asBuyer(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_BUYER"));
    }

    private Review sample() {
        return new Review(10L, 100L, 1L, 42L, 5, OffsetDateTime.now());
    }

    @Test
    void create_returns201() throws Exception {
        when(reviewService.createForOrder(eq(1L), eq(100L), any(CreateReviewRequest.class)))
                .thenReturn(sample());

        mockMvc.perform(post("/buyer/orders/100/review")
                .with(asBuyer(1L)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":5,\"comment\":\"Great fish!\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating").value(5));
    }

    @Test
    void create_orderNotCompleted_returns409() throws Exception {
        when(reviewService.createForOrder(eq(1L), eq(100L), any(CreateReviewRequest.class)))
                .thenThrow(new IllegalStateException("Order must be completed before reviewing."));

        mockMvc.perform(post("/buyer/orders/100/review")
                .with(asBuyer(1L)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":5}"))
                .andExpect(status().isConflict());
    }

    @Test
    void create_orderNotFound_returns404() throws Exception {
        when(reviewService.createForOrder(eq(1L), eq(100L), any(CreateReviewRequest.class)))
                .thenThrow(new ResourceNotFoundException("Order not found: 100"));

        mockMvc.perform(post("/buyer/orders/100/review")
                .with(asBuyer(1L)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":5}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getMyReview_present_returns200() throws Exception {
        when(reviewService.getMyReviewForOrder(1L, 100L)).thenReturn(Optional.of(sample()));

        mockMvc.perform(get("/buyer/orders/100/review").with(asBuyer(1L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void getMyReview_absent_returns404() throws Exception {
        when(reviewService.getMyReviewForOrder(1L, 100L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/buyer/orders/100/review").with(asBuyer(1L)))
                .andExpect(status().isNotFound());
    }

    @Test
    void vendorStorefront_publicAccess() throws Exception {
        VendorStorefront sf = new VendorStorefront(
                new BuyerVendorProfile(42L, "Marina Seafoods"),
                List.of(),
                List.of(sample()));
        when(storefrontService.getStorefront(42L)).thenReturn(sf);

        mockMvc.perform(get("/vendors/42/storefront").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vendor.fullName").value("Marina Seafoods"))
                .andExpect(jsonPath("$.recentReviews[0].rating").value(5));
    }

    @Test
    void vendorReviews_publicAccess() throws Exception {
        PagedReviews paged = new PagedReviews(List.of(sample()), 0, 10, 1L, 1);
        when(reviewService.listForVendor(eq(42L), eq(0), eq(10))).thenReturn(paged);

        mockMvc.perform(get("/vendors/42/reviews?page=0&size=10").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].rating").value(5));
    }
}

package com.mermaid.app.controller;

import com.mermaid.app.config.JacksonConfig;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.model.BuyerCheckoutRequest;
import com.mermaid.app.model.BuyerCheckoutResult;
import com.mermaid.app.service.CheckoutService;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BuyerCheckoutController.class)
@Import({BuyerCheckoutControllerTest.TestConfig.class, JacksonConfig.class})
class BuyerCheckoutControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;

    @MockitoBean CheckoutService checkoutService;
    @MockitoBean JwtDecoder jwtDecoder;

    private static RequestPostProcessor asBuyer(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_BUYER"));
    }

    @Test
    void checkout_validRequest_returns201WithOrderIds() throws Exception {
        BuyerCheckoutResult result = new BuyerCheckoutResult(List.of(101L, 102L));
        result.setGrandTotal(2540.0);
        when(checkoutService.checkout(eq(1L), any(BuyerCheckoutRequest.class))).thenReturn(result);

        mockMvc.perform(post("/buyer/checkout")
                .with(asBuyer(1L)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"groups\":[{\"vendorId\":42,\"dispatchMode\":\"PICKUP\"}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderIds[0]").value(101))
                .andExpect(jsonPath("$.grandTotal").value(2540.0));
    }

    @Test
    void checkout_emptyCart_returns400() throws Exception {
        when(checkoutService.checkout(eq(1L), any(BuyerCheckoutRequest.class)))
                .thenThrow(new IllegalArgumentException("Cart is empty."));

        mockMvc.perform(post("/buyer/checkout")
                .with(asBuyer(1L)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"groups\":[{\"vendorId\":42,\"dispatchMode\":\"PICKUP\"}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void checkout_listingClosedMidCheckout_returns409() throws Exception {
        when(checkoutService.checkout(eq(1L), any(BuyerCheckoutRequest.class)))
                .thenThrow(new ListingClosedException("Some items unavailable."));

        mockMvc.perform(post("/buyer/checkout")
                .with(asBuyer(1L)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"groups\":[{\"vendorId\":42,\"dispatchMode\":\"PICKUP\"}]}"))
                .andExpect(status().isConflict());
    }
}

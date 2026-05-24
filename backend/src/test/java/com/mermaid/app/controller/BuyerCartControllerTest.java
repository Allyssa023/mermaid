package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.config.JacksonConfig;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.AddCartItemRequest;
import com.mermaid.app.model.BuyerCartView;
import com.mermaid.app.service.CartService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BuyerCartController.class)
@Import({BuyerCartControllerTest.TestConfig.class, JacksonConfig.class})
class BuyerCartControllerTest {

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

    @MockitoBean CartService cartService;
    @MockitoBean JwtDecoder jwtDecoder;

    private static RequestPostProcessor asBuyer(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_BUYER"));
    }

    private BuyerCartView emptyCart() {
        return new BuyerCartView(List.of(), 0.0, 0);
    }

    @Test
    void getCart_returns200WithEmptyCart() throws Exception {
        when(cartService.getCart(eq(1L))).thenReturn(emptyCart());

        mockMvc.perform(get("/buyer/cart").with(asBuyer(1L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCount").value(0))
                .andExpect(jsonPath("$.grandTotal").value(0.0))
                .andExpect(jsonPath("$.groups").isArray());
    }

    @Test
    void getCart_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/buyer/cart"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void addItem_validRequest_returns200() throws Exception {
        when(cartService.addItem(eq(1L), any(AddCartItemRequest.class)))
                .thenReturn(new CartService.AddItemResult(emptyCart(), null));

        mockMvc.perform(post("/buyer/cart/items")
                .with(asBuyer(1L)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"listingId\":42,\"quantityKg\":3.5}"))
                .andExpect(status().isOk());
    }

    @Test
    void addItem_listingNotFound_returns404() throws Exception {
        when(cartService.addItem(eq(1L), any(AddCartItemRequest.class)))
                .thenThrow(new ResourceNotFoundException("Listing not found: 42"));

        mockMvc.perform(post("/buyer/cart/items")
                .with(asBuyer(1L)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"listingId\":42,\"quantityKg\":3.5}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void addItem_listingClosed_returns409() throws Exception {
        when(cartService.addItem(eq(1L), any(AddCartItemRequest.class)))
                .thenThrow(new ListingClosedException("This listing is no longer accepting orders."));

        mockMvc.perform(post("/buyer/cart/items")
                .with(asBuyer(1L)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"listingId\":42,\"quantityKg\":3.5}"))
                .andExpect(status().isConflict());
    }

    @Test
    void removeItem_returns200() throws Exception {
        when(cartService.removeItem(eq(1L), eq(99L))).thenReturn(emptyCart());

        mockMvc.perform(delete("/buyer/cart/items/99")
                .with(asBuyer(1L)).with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    void clearCart_returns200() throws Exception {
        when(cartService.clearCart(eq(1L))).thenReturn(emptyCart());

        mockMvc.perform(delete("/buyer/cart")
                .with(asBuyer(1L)).with(csrf()))
                .andExpect(status().isOk());
    }
}

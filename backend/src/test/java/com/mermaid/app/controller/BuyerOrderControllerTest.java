package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.config.JacksonConfig;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.FishSpecies;
import com.mermaid.app.model.Order;
import com.mermaid.app.model.UserRef;
import com.mermaid.app.service.BuyerOrderService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BuyerOrderController.class)
@Import({BuyerOrderControllerTest.TestConfig.class, JacksonConfig.class})
class BuyerOrderControllerTest {

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

    @MockitoBean BuyerOrderService buyerOrderService;
    @MockitoBean JwtDecoder jwtDecoder;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asBuyer(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_BUYER"));
    }

    // --- placeOrder ---

    @Test
    void placeOrder_valid_returns201() throws Exception {
        when(buyerOrderService.placeOrder(any(), eq(42L)))
            .thenReturn(sampleOrder());

        mockMvc.perform(post("/buyer/orders")
               .with(asBuyer(42L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"listingId\":1,\"dispatchMode\":\"PICKUP\"}"))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void placeOrder_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/buyer/orders")
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"listingId\":1,\"dispatchMode\":\"PICKUP\"}"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void placeOrder_listingNotFound_returns404() throws Exception {
        when(buyerOrderService.placeOrder(any(), anyLong()))
            .thenThrow(new ResourceNotFoundException("Listing not found"));

        mockMvc.perform(post("/buyer/orders")
               .with(asBuyer(42L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"listingId\":99,\"dispatchMode\":\"PICKUP\"}"))
               .andExpect(status().isNotFound());
    }

    @Test
    void placeOrder_deliveryWithoutAddress_returns400() throws Exception {
        when(buyerOrderService.placeOrder(any(), anyLong()))
            .thenThrow(new IllegalArgumentException("deliveryAddress is required for DELIVERY orders"));

        mockMvc.perform(post("/buyer/orders")
               .with(asBuyer(42L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"listingId\":1,\"dispatchMode\":\"DELIVERY\"}"))
               .andExpect(status().isBadRequest());
    }

    // --- getMyOrders ---

    @Test
    void getMyOrders_returns200() throws Exception {
        when(buyerOrderService.getMyOrders(eq(42L), isNull()))
            .thenReturn(List.of(sampleOrder()));

        mockMvc.perform(get("/buyer/orders")
               .with(asBuyer(42L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(10));
    }

    @Test
    void getMyOrders_withStatusFilter_returns200() throws Exception {
        when(buyerOrderService.getMyOrders(eq(42L), eq("PENDING")))
            .thenReturn(List.of(sampleOrder()));

        mockMvc.perform(get("/buyer/orders?status=PENDING")
               .with(asBuyer(42L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(10));
    }

    // --- getOrderById ---

    @Test
    void getOrderById_ownOrder_returns200() throws Exception {
        when(buyerOrderService.getOrderById(eq(10L), eq(42L)))
            .thenReturn(sampleOrder());

        mockMvc.perform(get("/buyer/orders/10")
               .with(asBuyer(42L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void getOrderById_notOwned_returns404() throws Exception {
        when(buyerOrderService.getOrderById(anyLong(), anyLong()))
            .thenThrow(new ResourceNotFoundException("Order not found"));

        mockMvc.perform(get("/buyer/orders/99")
               .with(asBuyer(42L)))
               .andExpect(status().isNotFound());
    }

    // --- helpers ---

    private Order sampleOrder() {
        return new Order(
            10L,
            new UserRef(42L, "Test Buyer"),
            new UserRef(5L, "Test Seller"),
            new FishSpecies(2L, "Bangus", true),
            150.0,
            Order.StatusEnum.PENDING,
            OffsetDateTime.now());
    }
}

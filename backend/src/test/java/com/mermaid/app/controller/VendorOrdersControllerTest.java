package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.model.VendorOrderSummary;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.service.VendorOrderService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;
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

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VendorOrdersController.class)
@Import({VendorOrdersControllerTest.TestConfig.class, com.mermaid.app.config.JacksonConfig.class})
class VendorOrdersControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;

    @MockitoBean VendorOrderService service;
    @MockitoBean UserRepository userRepo;
    @MockitoBean FishSpeciesRepository speciesRepo;
    @MockitoBean JwtDecoder jwtDecoder;

    private final ObjectMapper om = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .registerModule(new JsonNullableModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asVendor(long id) {
        return jwt().jwt(b -> b.subject(String.valueOf(id)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }

    // ---- GET /vendor/orders ----

    @Test
    void listOrders_happyPath_returns200() throws Exception {
        Order order = order(1L, 10L, 20L, "PENDING");
        when(service.listInbox(10L, null, null)).thenReturn(List.of(order));
        when(userRepo.findById(20L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/vendor/orders").with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void listOrders_withBucketFilter_returns200() throws Exception {
        when(service.listInbox(10L, "NEW", null)).thenReturn(List.of());

        mockMvc.perform(get("/vendor/orders")
                .param("bucket", "NEW")
                .with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$").isArray());
    }

    @Test
    void listOrders_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/vendor/orders"))
               .andExpect(status().isUnauthorized());
    }

    // ---- POST /vendor/orders/{id}/accept ----

    @Test
    void acceptOrder_happyPath_returns200() throws Exception {
        Order accepted = order(1L, 10L, 20L, "ACCEPTED");
        when(service.accept(10L, 1L)).thenReturn(accepted);
        when(userRepo.findById(20L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/vendor/orders/1/accept").with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.status").value("ACCEPTED"));
    }

    @Test
    void acceptOrder_illegalTransition_returns400() throws Exception {
        when(service.accept(10L, 1L))
                .thenThrow(new IllegalArgumentException("Cannot transition COMPLETED to ACCEPTED"));

        mockMvc.perform(post("/vendor/orders/1/accept").with(asVendor(10L)))
               .andExpect(status().isBadRequest());
    }

    @Test
    void acceptOrder_notFound_returns404() throws Exception {
        when(service.accept(10L, 99L))
                .thenThrow(new com.mermaid.app.exception.ResourceNotFoundException("Order not found: 99"));

        mockMvc.perform(post("/vendor/orders/99/accept").with(asVendor(10L)))
               .andExpect(status().isNotFound());
    }

    // ---- POST /vendor/orders/{id}/complete ----

    @Test
    void completeOrder_happyPath_returns200() throws Exception {
        Order completed = order(1L, 10L, 20L, "COMPLETED");
        when(service.complete(10L, 1L)).thenReturn(completed);
        when(userRepo.findById(20L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/vendor/orders/1/complete").with(asVendor(10L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void completeOrder_insufficientStock_returns409() throws Exception {
        when(service.complete(10L, 1L))
                .thenThrow(new com.mermaid.app.exception.InsufficientStockException("insufficient"));

        mockMvc.perform(post("/vendor/orders/1/complete").with(asVendor(10L)))
               .andExpect(status().isConflict());
    }

    // ---- POST /vendor/orders/{id}/cancel ----

    @Test
    void cancelOrder_happyPath_returns200() throws Exception {
        Order cancelled = order(1L, 10L, 20L, "CANCELLED");
        when(service.cancel(10L, 1L, "out of stock")).thenReturn(cancelled);
        when(userRepo.findById(20L)).thenReturn(Optional.empty());

        String body = "{\"reason\":\"out of stock\"}";
        mockMvc.perform(post("/vendor/orders/1/cancel")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    // ---- helpers ----

    private static Order order(Long id, Long sellerId, Long buyerId, String status) {
        Order o = new Order();
        o.setId(id);
        o.setSellerId(sellerId);
        o.setBuyerId(buyerId);
        o.setStatus(status);
        o.setKind(OrderKind.RETAIL);
        o.setAgreedPricePerKg(BigDecimal.valueOf(200));
        return o;
    }
}

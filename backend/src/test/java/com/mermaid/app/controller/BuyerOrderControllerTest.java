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
import java.util.Optional;

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
    @MockitoBean com.mermaid.app.service.OrderTimelineService timelineService;
    @MockitoBean com.mermaid.app.service.PaymentGatewayService paymentGatewayService;
    @MockitoBean com.mermaid.app.repository.OrderRepository orderRepository;
    @MockitoBean com.mermaid.app.repository.PaymentRepository paymentRepository;
    @MockitoBean com.mermaid.app.repository.HandoffConfirmationRepository handoffConfirmationRepository;
    @MockitoBean com.mermaid.app.service.BuyerActivityService buyerActivityService;
    @MockitoBean com.mermaid.app.service.CartService cartService;
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
               .andExpect(status().isForbidden());
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

    // --- createPaymentIntent ---

    @Test
    void createPaymentIntent_gcash_returns201WithRedirectUrl() throws Exception {
        var order = minimalOrder(10L, 42L, 99L);
        when(orderRepository.findById(10L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(10L)).thenReturn(Optional.empty());
        when(handoffConfirmationRepository.findByOrderId(10L))
            .thenReturn(Optional.of(confirmedHandoff(500L, 10L, java.math.BigDecimal.valueOf(1500))));
        when(paymentGatewayService.createPaymentRequest(
                anyLong(), eq("GCASH"), anyString(), anyString(), anyString()))
            .thenReturn(new com.mermaid.app.service.PaymentGatewayService.PaymentRequestResult(
                "pr_gcash_1", "https://gcash.redirect/pay", null, null));
        when(paymentGatewayService.getGatewayName()).thenReturn("XENDIT");

        mockMvc.perform(post("/buyer/orders/10/payment-intent?method=GCASH")
                .with(asBuyer(42L)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.redirectUrl").value("https://gcash.redirect/pay"))
            .andExpect(jsonPath("$.gateway").value("XENDIT"));
    }

    @Test
    void createPaymentIntent_card_returns201WithClientKey() throws Exception {
        var order = minimalOrder(11L, 42L, 99L);
        when(orderRepository.findById(11L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(11L)).thenReturn(Optional.empty());
        when(handoffConfirmationRepository.findByOrderId(11L))
            .thenReturn(Optional.of(confirmedHandoff(501L, 11L, java.math.BigDecimal.valueOf(1500))));
        when(paymentGatewayService.createPaymentRequest(
                anyLong(), eq("CARD"), anyString(), anyString(), anyString()))
            .thenReturn(new com.mermaid.app.service.PaymentGatewayService.PaymentRequestResult(
                "pr_card_1", null, "ck_xendit", "pk_xendit"));
        when(paymentGatewayService.getGatewayName()).thenReturn("XENDIT");

        mockMvc.perform(post("/buyer/orders/11/payment-intent?method=CARD")
                .with(asBuyer(42L)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.clientKey").value("ck_xendit"));
    }

    @Test
    void createPaymentIntent_retailWithoutConfirmedHandoff_returns422() throws Exception {
        var order = minimalOrder(12L, 42L, 99L);
        when(orderRepository.findById(12L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(12L)).thenReturn(Optional.empty());
        when(handoffConfirmationRepository.findByOrderId(12L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/buyer/orders/12/payment-intent?method=GCASH")
                .with(asBuyer(42L)))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void createPaymentIntent_asVendorRole_allowed() throws Exception {
        var order = minimalOrder(13L, 42L, 99L);
        when(orderRepository.findById(13L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(13L)).thenReturn(Optional.empty());
        when(handoffConfirmationRepository.findByOrderId(13L))
            .thenReturn(Optional.of(confirmedHandoff(502L, 13L, java.math.BigDecimal.valueOf(1500))));
        when(paymentGatewayService.createPaymentRequest(
                anyLong(), eq("GCASH"), anyString(), anyString(), anyString()))
            .thenReturn(new com.mermaid.app.service.PaymentGatewayService.PaymentRequestResult(
                "pr_gcash_2", "https://gcash.redirect/pay2", null, null));
        when(paymentGatewayService.getGatewayName()).thenReturn("XENDIT");

        mockMvc.perform(post("/buyer/orders/13/payment-intent?method=GCASH")
                .with(asVendor(42L)))
            .andExpect(status().isCreated());
    }

    private static com.mermaid.app.domain.HandoffConfirmation confirmedHandoff(Long id, Long orderId, java.math.BigDecimal total) {
        var h = new com.mermaid.app.domain.HandoffConfirmation();
        h.setId(id);
        h.setOrderId(orderId);
        h.setActualQtyKg(java.math.BigDecimal.TEN);
        h.setFinalPricePerKg(java.math.BigDecimal.valueOf(150));
        h.setTotalAmount(total);
        h.setStatus("CONFIRMED");
        return h;
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asVendor(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }

    // --- helpers ---

    private static com.mermaid.app.domain.Order minimalOrder(Long id, Long buyerId, Long sellerId) {
        var o = new com.mermaid.app.domain.Order();
        o.setId(id); o.setBuyerId(buyerId); o.setSellerId(sellerId);
        o.setAgreedPricePerKg(java.math.BigDecimal.valueOf(150));
        o.setOrderedQtyKg(java.math.BigDecimal.TEN);
        o.setStatus("PENDING");
        o.setKind(com.mermaid.app.domain.OrderKind.RETAIL);
        return o;
    }

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

package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.domain.User;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.service.PaymentGatewayService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderPayoutController.class)
class OrderPayoutControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean PaymentGatewayService gatewayService;
    @MockitoBean OrderRepository orderRepository;
    @MockitoBean PaymentRepository paymentRepository;
    @MockitoBean UserRepository userRepository;
    @MockitoBean JwtDecoder jwtDecoder;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asVendor(long id) {
        return jwt().jwt(b -> b.subject(String.valueOf(id)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }

    @Test
    void initiatePayout_gcash_returns201() throws Exception {
        Order order = procurementOrder(1L, 10L, 20L);
        User fisherman = userWithGcash(20L, "09171234567");

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(1L)).thenReturn(Optional.empty());
        when(userRepository.findById(20L)).thenReturn(Optional.of(fisherman));
        when(gatewayService.disburse(eq("09171234567"), eq("PH_GCASH"),
                anyLong(), anyString(), anyString()))
            .thenReturn(new PaymentGatewayService.DisbursementResult("po_123", "SUCCEEDED"));
        when(gatewayService.getGatewayName()).thenReturn("XENDIT");

        mockMvc.perform(post("/orders/1/payout")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("channelCode", "PH_GCASH"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.payoutId").value("po_123"))
            .andExpect(jsonPath("$.status").value("SUCCEEDED"));
    }

    @Test
    void initiatePayout_noGcashNumber_returns422() throws Exception {
        Order order = procurementOrder(2L, 10L, 20L);
        User fisherman = new User();
        fisherman.setId(20L);
        // no gcash/maya number set

        when(orderRepository.findById(2L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(2L)).thenReturn(Optional.empty());
        when(userRepository.findById(20L)).thenReturn(Optional.of(fisherman));

        mockMvc.perform(post("/orders/2/payout")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("channelCode", "PH_GCASH"))))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void initiatePayout_alreadyPaid_returns409() throws Exception {
        Order order = procurementOrder(3L, 10L, 20L);
        when(orderRepository.findById(3L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(3L))
            .thenReturn(Optional.of(new com.mermaid.app.domain.Payment()));

        mockMvc.perform(post("/orders/3/payout")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("channelCode", "PH_GCASH"))))
            .andExpect(status().isConflict());
    }

    private Order procurementOrder(Long id, Long buyerId, Long sellerId) {
        Order o = new Order();
        o.setId(id); o.setBuyerId(buyerId); o.setSellerId(sellerId);
        o.setAgreedPricePerKg(BigDecimal.valueOf(100));
        o.setOrderedQtyKg(BigDecimal.TEN);
        o.setKind(OrderKind.PROCUREMENT);
        o.setStatus("CONFIRMED");
        return o;
    }

    private User userWithGcash(Long id, String phone) {
        User u = new User();
        u.setId(id);
        u.setGcashNumber(phone);
        return u;
    }
}

package com.mermaid.app.controller;

import com.mermaid.app.domain.Payment;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.service.PaymentGatewayService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentWebhookController.class)
@Import(PaymentWebhookControllerTest.WebhookTestSecurity.class)
class PaymentWebhookControllerTest {

    /** Minimal security config: disable CSRF, permit /webhooks/** publicly. */
    @TestConfiguration
    static class WebhookTestSecurity {
        @Bean
        SecurityFilterChain testChain(HttpSecurity http) throws Exception {
            http.csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/webhooks/**").permitAll()
                    .anyRequest().authenticated());
            return http.build();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean PaymentGatewayService gatewayService;
    @MockitoBean PaymentRepository paymentRepository;
    @MockitoBean JwtDecoder jwtDecoder;

    private static final String PAYLOAD =
        "{\"event\":\"payment.succeeded\",\"data\":{\"id\":\"pr_test_123\",\"reference_id\":\"idem-1\"}}";

    @Test
    void validToken_updatesPaymentStatus_returns200() throws Exception {
        when(gatewayService.verifyWebhookSignature(anyString(), eq("wh_token"))).thenReturn(true);
        Payment p = new Payment();
        p.setStatus("PENDING");
        p.setAmount(BigDecimal.TEN);
        when(paymentRepository.findByPaymentIntentId("pr_test_123")).thenReturn(Optional.of(p));

        mockMvc.perform(post("/webhooks/xendit")
                .contentType("application/json")
                .header("x-callback-token", "wh_token")
                .content(PAYLOAD))
            .andExpect(status().isOk());

        verify(paymentRepository).save(argThat(saved -> "CONFIRMED".equals(saved.getStatus())));
    }

    @Test
    void invalidToken_returns401_noSave() throws Exception {
        when(gatewayService.verifyWebhookSignature(anyString(), eq("bad"))).thenReturn(false);

        mockMvc.perform(post("/webhooks/xendit")
                .contentType("application/json")
                .header("x-callback-token", "bad")
                .content(PAYLOAD))
            .andExpect(status().isUnauthorized());

        verify(paymentRepository, never()).save(any());
    }

    @Test
    void unknownPaymentIntent_returns200_noSave() throws Exception {
        when(gatewayService.verifyWebhookSignature(anyString(), anyString())).thenReturn(true);
        when(paymentRepository.findByPaymentIntentId(anyString())).thenReturn(Optional.empty());

        mockMvc.perform(post("/webhooks/xendit")
                .contentType("application/json")
                .header("x-callback-token", "wh_token")
                .content(PAYLOAD))
            .andExpect(status().isOk());

        verify(paymentRepository, never()).save(any());
    }
}

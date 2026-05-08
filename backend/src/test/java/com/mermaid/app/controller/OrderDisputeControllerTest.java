package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mermaid.app.domain.OrderDispute;
import com.mermaid.app.service.DisputeService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderDisputeController.class)
@Import({OrderDisputeControllerTest.TestConfig.class, com.mermaid.app.config.JacksonConfig.class})
class OrderDisputeControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean DisputeService disputeService;
    @MockitoBean JwtDecoder jwtDecoder;

    private OrderDispute sampleDispute() {
        OrderDispute d = new OrderDispute();
        d.setOrderId(1L);
        d.setRaisedBy("FISHERMAN");
        d.setPreDisputeStatus("READY");
        d.setStatus("OPEN");
        return d;
    }

    @Test
    void fishermanRaiseDispute_returns_201() throws Exception {
        when(disputeService.raise(anyLong(), eq("FISHERMAN"), eq(1L), any()))
                .thenReturn(sampleDispute());

        mockMvc.perform(post("/fisherman/procurement-orders/1/dispute")
                .with(jwt().jwt(j -> j.subject("10").claim("roles", List.of("ROLE_FISHERMAN"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.raisedBy").value("FISHERMAN"));
    }

    @Test
    void fishermanGetDispute_returns_200() throws Exception {
        when(disputeService.getOpenDispute(1L)).thenReturn(sampleDispute());

        mockMvc.perform(get("/fisherman/procurement-orders/1/dispute")
                .with(jwt().jwt(j -> j.subject("10").claim("roles", List.of("ROLE_FISHERMAN")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    void vendorRaiseDispute_returns_201() throws Exception {
        OrderDispute d = sampleDispute();
        d.setRaisedBy("VENDOR");
        when(disputeService.raise(anyLong(), eq("VENDOR"), eq(1L), any())).thenReturn(d);

        mockMvc.perform(post("/vendor/procurement-orders/1/dispute")
                .with(jwt().jwt(j -> j.subject("20").claim("roles", List.of("ROLE_VENDOR"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.raisedBy").value("VENDOR"));
    }

    @Test
    void vendorResolveDispute_returns_200() throws Exception {
        OrderDispute d = sampleDispute();
        d.setStatus("RESOLVED");
        d.setResolution("Accepted weight as stated");
        when(disputeService.resolve(anyLong(), eq("VENDOR"), eq(1L), anyString())).thenReturn(d);

        mockMvc.perform(put("/vendor/procurement-orders/1/dispute/resolve")
                .with(jwt().jwt(j -> j.subject("20").claim("roles", List.of("ROLE_VENDOR"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"resolution\":\"Accepted weight as stated\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));
    }

}

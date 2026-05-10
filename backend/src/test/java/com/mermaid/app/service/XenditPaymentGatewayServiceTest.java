package com.mermaid.app.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class XenditPaymentGatewayServiceTest {

    @Mock RestClient.Builder restClientBuilder;
    @Mock RestClient restClient;

    XenditPaymentGatewayService service;

    @BeforeEach
    void setUp() {
        when(restClientBuilder.baseUrl(anyString())).thenReturn(restClientBuilder);
        when(restClientBuilder.defaultHeader(anyString(), anyString())).thenReturn(restClientBuilder);
        when(restClientBuilder.build()).thenReturn(restClient);
        service = new XenditPaymentGatewayService(
            restClientBuilder, "xnd_development_secret", "xnd_public_test", "wh_token");
    }

    @Test void getGatewayName_returnsXendit() { assertEquals("XENDIT", service.getGatewayName()); }

    @Test void verifyWebhookSignature_matchingToken_returnsTrue() {
        assertTrue(service.verifyWebhookSignature("{}", "wh_token"));
    }

    @Test void verifyWebhookSignature_wrongToken_returnsFalse() {
        assertFalse(service.verifyWebhookSignature("{}", "wrong"));
    }

    @Test void verifyWebhookSignature_nullToken_returnsFalse() {
        assertFalse(service.verifyWebhookSignature("{}", null));
    }
}

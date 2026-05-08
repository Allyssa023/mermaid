package com.mermaid.app.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TextbeeSmsServiceTest {

    @Mock RestTemplate restTemplate;
    TextbeeSmsService service;

    @BeforeEach void setup() {
        service = new TextbeeSmsService(
            "test-api-key", "globe-device-id", "smart-device-id",
            "https://api.textbee.dev", restTemplate
        );
    }

    @Test
    void globe_prefix_0917_routes_to_globe_device() {
        when(restTemplate.postForObject(contains("globe-device-id"), any(), eq(Object.class)))
            .thenReturn(null);
        service.send("09171234567", "Test");
        verify(restTemplate).postForObject(contains("globe-device-id"), any(), eq(Object.class));
    }

    @Test
    void smart_prefix_0919_routes_to_smart_device() {
        when(restTemplate.postForObject(contains("smart-device-id"), any(), eq(Object.class)))
            .thenReturn(null);
        service.send("09191234567", "Test");
        verify(restTemplate).postForObject(contains("smart-device-id"), any(), eq(Object.class));
    }

    @Test
    void unknown_prefix_defaults_to_globe_device() {
        when(restTemplate.postForObject(contains("globe-device-id"), any(), eq(Object.class)))
            .thenReturn(null);
        service.send("09991234567", "Test");
        verify(restTemplate).postForObject(contains("globe-device-id"), any(), eq(Object.class));
    }
}

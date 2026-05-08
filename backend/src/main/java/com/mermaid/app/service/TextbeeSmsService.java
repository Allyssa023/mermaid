package com.mermaid.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Set;

@Service
public class TextbeeSmsService implements SmsService {

    private static final Logger log = LoggerFactory.getLogger(TextbeeSmsService.class);

    private static final Set<String> SMART_PREFIXES =
        Set.of("0919","0920","0921","0928","0929","0930","0939");

    private final String apiKey;
    private final String globeDeviceId;
    private final String smartDeviceId;
    private final String baseUrl;
    private final RestTemplate restTemplate;

    public TextbeeSmsService(
            @Value("${sms.textbee.api-key}") String apiKey,
            @Value("${sms.textbee.globe-device-id}") String globeDeviceId,
            @Value("${sms.textbee.smart-device-id}") String smartDeviceId,
            @Value("${sms.textbee.base-url:https://api.textbee.dev}") String baseUrl,
            RestTemplate restTemplate) {
        this.apiKey = apiKey;
        this.globeDeviceId = globeDeviceId;
        this.smartDeviceId = smartDeviceId;
        this.baseUrl = baseUrl;
        this.restTemplate = restTemplate;
    }

    @Override
    public void send(String toNumber, String message) {
        String deviceId = routeDevice(toNumber);
        String url = baseUrl + "/api/v1/gateway/devices/" + deviceId + "/send-sms";
        Map<String, Object> body = Map.of(
            "recipients", new String[]{ toNumber },
            "message", message
        );
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-api-key", apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        restTemplate.postForObject(url, new HttpEntity<>(body, headers), Object.class);
        log.info("SMS sent to {} via device {}", toNumber, deviceId);
    }

    private String routeDevice(String phone) {
        if (phone == null || phone.length() < 4) return globeDeviceId;
        String prefix = phone.substring(0, 4);
        return SMART_PREFIXES.contains(prefix) ? smartDeviceId : globeDeviceId;
    }
}

package com.mermaid.app.client;

import com.mermaid.app.client.dto.MarineAllConditionsDto;
import com.mermaid.app.client.dto.MarineZoneConditionsDto;
import com.mermaid.app.exception.MarineServiceUnavailableException;
import com.mermaid.app.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.function.Supplier;

@Component
public class MarineServiceClient {

    private final RestClient restClient;

    public MarineServiceClient(
            @Value("${marine.service.url}") String baseUrl,
            @Value("${marine.service.api-key}") String apiKey,
            @Value("${marine.service.timeout-seconds:5}") int timeoutSeconds) {

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-API-Key", apiKey)
                .requestFactory(factory)
                .build();
    }

    public MarineAllConditionsDto getAllConditions() {
        try {
            return callWithRetry(() -> restClient.get()
                    .uri("/api/conditions")
                    .retrieve()
                    .body(MarineAllConditionsDto.class));
        } catch (HttpClientErrorException e) {
            // 401 = misconfigured API key — our bug, not user's → 503
            throw new MarineServiceUnavailableException("Marine service error: " + e.getStatusCode());
        }
    }

    public MarineZoneConditionsDto getZoneConditions(String zoneId) {
        try {
            return callWithRetry(() -> restClient.get()
                    .uri("/api/conditions/{zoneId}", zoneId)
                    .retrieve()
                    .body(MarineZoneConditionsDto.class));
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new ResourceNotFoundException("Zone not found: " + zoneId);
            }
            throw new MarineServiceUnavailableException("Marine service error: " + e.getStatusCode());
        }
    }

    /**
     * Retries once on 5xx or network failure — no delay, no extra library.
     * Does NOT catch HttpClientErrorException (4xx) — callers handle those.
     */
    private <T> T callWithRetry(Supplier<T> call) {
        try {
            return call.get();
        } catch (HttpServerErrorException | ResourceAccessException first) {
            try {
                return call.get();
            } catch (HttpServerErrorException | ResourceAccessException second) {
                throw new MarineServiceUnavailableException("Marine service unavailable after retry");
            }
        }
    }
}

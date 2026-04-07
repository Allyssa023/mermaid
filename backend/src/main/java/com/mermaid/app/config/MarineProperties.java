package com.mermaid.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Externalized configuration for the Python marine microservice.
 * Bound to the {@code marine.service.*} prefix in application.properties.
 */
@ConfigurationProperties(prefix = "marine.service")
public record MarineProperties(
        String url,
        String apiKey
) {}

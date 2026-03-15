package com.mermaid.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/**
 * JWT configuration. Secret must be at least 256 bits (32 chars) for HS256.
 * In production, set JWT_SECRET via environment variable; never commit production secrets.
 */
@ConfigurationProperties(prefix = "jwt")
@Validated
public class JwtProperties {

    @NotBlank(message = "jwt.secret must be set and at least 32 characters for HS256")
    private String secret;

    @NotBlank(message = "jwt.issuer must be set")
    private String issuer = "mermaid-api";

    @Positive
    private long expirySeconds = 86400L;

    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }

    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }

    public long getExpirySeconds() { return expirySeconds; }
    public void setExpirySeconds(long expirySeconds) { this.expirySeconds = expirySeconds; }
}

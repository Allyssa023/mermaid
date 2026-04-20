package com.mermaid.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Global filter that validates JWT tokens at the gateway edge.
 *
 * Flow:
 * 1. Checks if the path is public (login, register, logout) — skips validation
 * 2. Reads JWT from HttpOnly 'jwt' cookie first, then falls back to Authorization header
 *    (matches the backend's existing cookieBearerTokenResolver behavior)
 * 3. Validates signature and expiry using the same HS256 secret as the backend
 * 4. Extracts claims and forwards as trusted headers to downstream services:
 *    - X-User-Id       (from 'sub' claim)
 *    - X-User-Role     (from 'role' claim)
 *    - X-User-Email    (from 'email' claim)
 *    - X-User-FullName (from 'fullName' claim)
 * 5. Also forwards the original JWT so the backend can still validate if desired
 * 6. Rejects unauthorized requests with 401
 */
@Component
public class JwtAuthGlobalFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthGlobalFilter.class);

    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/register-message",
            "/api/auth/logout",
            "/api/auth/verify-email",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/otp/verify",
            "/api/oauth2/",
            "/api/login/oauth2/"
    );

    private final SecretKey key;

    public JwtAuthGlobalFilter(@Value("${jwt.secret}") String secret) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // Skip auth for public endpoints
        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        // 1. Try JWT from HttpOnly 'jwt' cookie first
        String token = extractTokenFromCookie(request);

        // 2. Fallback to Authorization: Bearer header
        if (token == null) {
            token = extractTokenFromHeader(request);
        }

        // No token found → reject
        if (token == null) {
            log.debug("No JWT found for path: {}", path);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // Validate and extract claims
        Claims claims;
        try {
            claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception e) {
            log.debug("Invalid JWT for path {}: {}", path, e.getMessage());
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // Forward trusted headers downstream
        ServerHttpRequest mutatedRequest = request.mutate()
                .header("X-User-Id", claims.getSubject())
                .header("X-User-Role", claims.get("role", String.class))
                .header("X-User-Email", claims.get("email", String.class))
                .header("X-User-FullName", claims.get("fullName", String.class))
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    @Override
    public int getOrder() {
        // Run early in the filter chain
        return -1;
    }

    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    private String extractTokenFromCookie(ServerHttpRequest request) {
        HttpCookie cookie = request.getCookies().getFirst("jwt");
        if (cookie != null && !cookie.getValue().isBlank()) {
            return cookie.getValue();
        }
        return null;
    }

    private String extractTokenFromHeader(ServerHttpRequest request) {
        String header = request.getHeaders().getFirst("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}

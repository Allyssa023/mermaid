package com.mermaid.app.security;

import com.mermaid.app.config.JwtProperties;
import com.mermaid.app.domain.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Issues JWTs for authenticated users. Uses HMAC-SHA256 (HS256) with a symmetric secret.
 * Token contains: sub (userId), role, email, iss, exp so the resource server can authorize without DB lookup.
 */
@Service
public class JwtTokenService {

    private final JwtProperties props;
    private final SecretKey key;

    public JwtTokenService(JwtProperties props) {
        this.props = props;
        byte[] keyBytes = props.getSecret().getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalArgumentException("jwt.secret must be at least 32 bytes (256 bits) for HS256");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String issueToken(User user) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .subject(String.valueOf(user.getId()))
            .claim("role", user.getRole().getValue())
            .claim("email", user.getEmail())
            .claim("fullName", user.getFullName())
            .issuer(props.getIssuer())
            .issuedAt(new Date(now))
            .expiration(new Date(now + props.getExpirySeconds() * 1000L))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }

    public long getExpirySeconds() {
        return props.getExpirySeconds();
    }
}

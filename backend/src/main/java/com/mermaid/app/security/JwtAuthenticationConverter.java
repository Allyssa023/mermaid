package com.mermaid.app.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.Collection;
import java.util.Collections;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Maps JWT to Spring Security authentication. Extracts role claim and adds ROLE_ prefix
 * so @PreAuthorize("hasRole('ADMIN')") works. Prevents privilege escalation by using
 * only server-issued claims (role), not client-supplied data.
 */
public class JwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private static final String ROLE_CLAIM = "role";
    private static final String ROLE_PREFIX = "ROLE_";

    @Override
    public AbstractAuthenticationToken convert(@NonNull Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        return new JwtAuthenticationToken(jwt, authorities);
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        String role = jwt.getClaimAsString(ROLE_CLAIM);
        if (role == null || role.isBlank()) {
            return Collections.emptyList();
        }
        return Stream.of(role)
            .map(r -> new SimpleGrantedAuthority(ROLE_PREFIX + r))
            .collect(Collectors.toList());
    }
}

package com.mermaid.app.config;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtDecoder jwtDecoder;

    @Value("${cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    public WebSocketConfig(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-chat")
                .setAllowedOriginPatterns("*")
                .addInterceptors(new JwtCookieHandshakeInterceptor());
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // 1. Try token from cookie (stored in session attributes during handshake)
                    Map<String, Object> sessionAttrs = accessor.getSessionAttributes();
                    String token = sessionAttrs != null ? (String) sessionAttrs.get("jwt") : null;

                    // 2. Fallback to Authorization header (for backwards compatibility)
                    if (token == null) {
                        List<String> authorization = accessor.getNativeHeader("Authorization");
                        if (authorization != null && !authorization.isEmpty()) {
                            String bearerToken = authorization.get(0);
                            if (bearerToken.startsWith("Bearer ")) {
                                token = bearerToken.substring(7);
                            }
                        }
                    }

                    if (token != null) {
                        try {
                            Jwt jwt = jwtDecoder.decode(token);
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                    jwt.getSubject(), null, List.of()
                            );
                            accessor.setUser(auth);
                        } catch (Exception e) {
                            // Invalid token — connection will proceed unauthenticated
                        }
                    }
                }
                return message;
            }
        });
    }

    /**
     * HandshakeInterceptor that extracts the JWT from the HttpOnly 'jwt' cookie
     * during the initial WebSocket HTTP upgrade and stores it in the session attributes.
     */
    private static class JwtCookieHandshakeInterceptor implements HandshakeInterceptor {
        @Override
        public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                        WebSocketHandler wsHandler, Map<String, Object> attributes) {
            if (request instanceof ServletServerHttpRequest servletRequest) {
                HttpServletRequest httpReq = servletRequest.getServletRequest();
                Cookie[] cookies = httpReq.getCookies();
                if (cookies != null) {
                    for (Cookie cookie : cookies) {
                        if ("jwt".equals(cookie.getName())) {
                            attributes.put("jwt", cookie.getValue());
                            break;
                        }
                    }
                }
            }
            return true; // always allow handshake
        }

        @Override
        public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                    WebSocketHandler wsHandler, Exception exception) {
            // no-op
        }
    }
}


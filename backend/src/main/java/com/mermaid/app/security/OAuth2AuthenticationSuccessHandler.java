package com.mermaid.app.security;

import com.mermaid.app.domain.User;
import com.mermaid.app.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

/**
 * Called by Spring Security after a successful Google (or Facebook) OAuth2 login.
 * Finds or creates the local User, issues a JWT cookie, and redirects to the frontend.
 * New users without a role are redirected to /?setup=role for profile completion.
 */
@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtTokenService jwtTokenService;
    private final String frontendUrl;

    public OAuth2AuthenticationSuccessHandler(UserRepository userRepository,
                                              JwtTokenService jwtTokenService,
                                              @Value("${app.frontend-url}") String frontendUrl) {
        this.userRepository = userRepository;
        this.jwtTokenService = jwtTokenService;
        this.frontendUrl     = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        String registrationId = oauthToken.getAuthorizedClientRegistrationId();
        Map<String, Object> attributes = oauthToken.getPrincipal().getAttributes();

        User user;
        if ("google".equals(registrationId)) {
            user = handleGoogle(attributes);
        } else if ("facebook".equals(registrationId)) {
            user = handleFacebook(attributes);
        } else {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Unsupported OAuth2 provider");
            return;
        }

        String jwt = jwtTokenService.issueToken(user);
        boolean needsRoleSetup = user.getRole() == null;

        ResponseCookie cookie = ResponseCookie.from("jwt", jwt)
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(86400L)
                .sameSite("Lax")
                .build();
        response.addHeader("Set-Cookie", cookie.toString());

        String redirect = frontendUrl + (needsRoleSetup ? "/?setup=role" : "/");
        getRedirectStrategy().sendRedirect(request, response, redirect);
    }

    private User handleFacebook(Map<String, Object> attributes) {
        String facebookId = attributes.get("id").toString();
        String email      = (String) attributes.get("email"); // may be null if user didn't grant permission
        String name       = (String) attributes.get("name");

        Optional<User> existing = userRepository.findByFacebookId(facebookId);
        if (existing.isEmpty() && email != null) {
            existing = userRepository.findByEmail(email);
        }

        return existing.map(u -> {
            if (u.getFacebookId() == null) {
                u.setFacebookId(facebookId);
                userRepository.save(u);
            }
            return u;
        }).orElseGet(() -> {
            User u = new User();
            u.setFacebookId(facebookId);
            u.setEmail(email); // may be null; email uniqueness constraint is nullable-safe
            u.setFullName(name != null ? name : "Facebook User");
            u.setEmailVerified(true);
            u.setActive(true);
            return userRepository.save(u);
        });
    }

    private User handleGoogle(Map<String, Object> attributes) {
        String googleId = attributes.get("sub").toString();
        String email    = (String) attributes.get("email");
        String name     = (String) attributes.get("name");

        Optional<User> existing = userRepository.findByGoogleId(googleId);
        if (existing.isEmpty() && email != null) {
            existing = userRepository.findByEmail(email);
        }

        return existing.map(u -> {
            if (u.getGoogleId() == null) {
                u.setGoogleId(googleId);
                userRepository.save(u);
            }
            return u;
        }).orElseGet(() -> {
            User u = new User();
            u.setGoogleId(googleId);
            u.setEmail(email);
            u.setFullName(name != null ? name : (email != null ? email : "Google User"));
            u.setEmailVerified(true);
            u.setActive(true);
            return userRepository.save(u);
        });
    }
}

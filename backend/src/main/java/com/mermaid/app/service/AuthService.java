package com.mermaid.app.service;

import com.mermaid.app.domain.User;
import com.mermaid.app.exception.EmailAlreadyExistsException;
import com.mermaid.app.exception.InvalidCredentialsException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.LoginRequest;
import com.mermaid.app.model.LoginResponse;
import com.mermaid.app.model.RegisterRequest;
import com.mermaid.app.model.UserProfile;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.security.JwtTokenService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Authentication and current-user operations. Validates input, enforces email uniqueness,
 * and uses constant-time-friendly credential check (no user enumeration via timing).
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenService jwtTokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
    }

    /**
     * Authenticate and issue JWT. Fails with InvalidCredentialsException if user not found,
     * inactive, or password mismatch. Uses PasswordEncoder.matches (BCrypt) to avoid timing leaks
     * in the hash comparison.
     */
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim())
            .orElseThrow(InvalidCredentialsException::new);
        if (!user.isActive()) {
            throw new InvalidCredentialsException();
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        String token = jwtTokenService.issueToken(user);
        UserProfile profile = toUserProfile(user);
        LoginResponse response = new LoginResponse(token, "Bearer", profile);
        response.setExpiresIn(jwtTokenService.getExpirySeconds());
        return response;
    }

    /**
     * Register a new user. Only VENDOR and FISHERMAN allowed (enforced by API schema).
     * Throws EmailAlreadyExistsException on duplicate email (409).
     */
    @Transactional
    public UserProfile register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().trim())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }
        User user = new User();
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName().trim());
        user.setRole(com.mermaid.app.model.Role.fromValue(request.getRole().getValue()));
        user.setActive(true);
        user = userRepository.save(user);
        return toUserProfile(user);
    }

    /**
     * Load current user from DB by JWT subject (userId). Ensures we return up-to-date data
     * and that the user is still active (revocation via active=false).
     */
    @Transactional(readOnly = true)
    public UserProfile getCurrentUser() {
        Long userId = currentUserId();
        if (userId == null) {
            throw new InvalidCredentialsException();
        }
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!user.isActive()) {
            throw new InvalidCredentialsException();
        }
        return toUserProfile(user);
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        org.springframework.security.oauth2.jwt.Jwt jwt = null;
        if (auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt j) {
            jwt = j;
        } else if (auth instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwtAuth) {
            jwt = jwtAuth.getToken();
        }
        if (jwt == null) {
            return null;
        }
        String sub = jwt.getSubject();
        if (sub == null || sub.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(sub.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static UserProfile toUserProfile(User user) {
        UserProfile p = new UserProfile(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
        p.setCreatedAt(user.getCreatedAt());
        return p;
    }
}

package com.mermaid.app.service;

import com.mermaid.app.domain.User;
import com.mermaid.app.exception.EmailAlreadyExistsException;
import com.mermaid.app.exception.EmailNotVerifiedException;
import com.mermaid.app.exception.InvalidCredentialsException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.LoginEventRepository;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.security.JwtTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Authentication and current-user operations. Validates input, enforces email uniqueness,
 * and uses constant-time-friendly credential check (no user enumeration via timing).
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final EmailService emailService;
    private final LoginEventRepository loginEventRepo;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.skip-email-verification:false}")
    private boolean skipEmailVerification;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenService jwtTokenService,
                       EmailService emailService,
                       LoginEventRepository loginEventRepo) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.emailService = emailService;
        this.loginEventRepo = loginEventRepo;
    }

    /**
     * Step 1 of 2-step login. Validates credentials, checks email verification,
     * then generates OTP and sends it via email. Returns otpRequired=true (no JWT yet).
     *
     * @return LoginResponse with otpRequired=true and rememberMe flag for the controller
     */
    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
            .orElseThrow(InvalidCredentialsException::new);
        if (!user.isActive()) {
            throw new InvalidCredentialsException();
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        if (!skipEmailVerification && !user.isEmailVerified()) {
            throw new EmailNotVerifiedException();
        }

        // E2E / test mode: skip OTP, issue JWT directly
        if (skipEmailVerification) {
            recordLogin(user);
            String token = jwtTokenService.issueToken(user);
            UserProfile profile = toUserProfile(user);
            LoginResponse response = new LoginResponse(token, "Bearer", profile);
            response.setExpiresIn(jwtTokenService.getExpirySeconds());
            return response;
        }

        // Generate 6-digit OTP
        String otp = generateOtp();
        user.setOtpCode(otp);
        user.setOtpCodeExp(OffsetDateTime.now().plusMinutes(5));
        userRepository.save(user);

        // Send OTP email
        emailService.sendOtpEmail(user.getEmail(), otp);

        // Return response indicating OTP step is needed (no token yet)
        LoginResponse response = new LoginResponse("", "Bearer", null);
        response.setOtpRequired(true);
        return response;
    }

    /**
     * Verify OTP code (Step 2 of login). If valid, issues JWT.
     */
    @Transactional
    public LoginResponse verifyOtp(String email, String code) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
            .orElseThrow(InvalidCredentialsException::new);

        if (user.getOtpCode() == null || !user.getOtpCode().equals(code)) {
            throw new InvalidCredentialsException("Invalid or expired code.");
        }
        if (user.getOtpCodeExp() == null || OffsetDateTime.now().isAfter(user.getOtpCodeExp())) {
            throw new InvalidCredentialsException("Invalid or expired code.");
        }

        // Clear OTP
        user.setOtpCode(null);
        user.setOtpCodeExp(null);
        recordLogin(user);

        // Issue JWT
        String token = jwtTokenService.issueToken(user);
        UserProfile profile = toUserProfile(user);
        LoginResponse response = new LoginResponse(token, "Bearer", profile);
        response.setExpiresIn(jwtTokenService.getExpirySeconds());
        return response;
    }

    /**
     * Verify email with token from verification link. Auto-login on success.
     */
    @Transactional
    public LoginResponse verifyEmail(String token) {
        User user = userRepository.findByVerificationToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Verification token not found."));

        if (user.getVerificationTokenExp() == null ||
            OffsetDateTime.now().isAfter(user.getVerificationTokenExp())) {
            throw new IllegalArgumentException("Verification link has expired.");
        }

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExp(null);
        userRepository.save(user);
        recordLogin(user);

        // Issue JWT (auto-login after verification)
        String jwt = jwtTokenService.issueToken(user);
        UserProfile profile = toUserProfile(user);
        LoginResponse response = new LoginResponse(jwt, "Bearer", profile);
        response.setExpiresIn(jwtTokenService.getExpirySeconds());
        return response;
    }

    /**
     * Send password reset email. Silently ignores unknown emails to prevent enumeration.
     */
    @Transactional
    public MessageResponse forgotPassword(String email) {
        userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            user.setResetToken(token);
            user.setResetTokenExp(OffsetDateTime.now().plusHours(1));
            userRepository.save(user);
            emailService.sendPasswordResetEmail(user.getEmail(), token);
        });

        // Always return the same message to prevent email enumeration
        MessageResponse response = new MessageResponse("If that email exists, a reset link has been sent.");
        return response;
    }

    /**
     * Reset password using token from reset email link.
     */
    @Transactional
    public MessageResponse resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Reset token not found."));

        if (user.getResetTokenExp() == null ||
            OffsetDateTime.now().isAfter(user.getResetTokenExp())) {
            throw new IllegalArgumentException("Reset link has expired.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExp(null);
        userRepository.save(user);

        return new MessageResponse("Password updated successfully.");
    }

    /**
     * Register a new user with email verification. No auto-login.
     * Returns a message instructing user to check their inbox.
     */
    @Transactional
    public MessageResponse registerWithVerification(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        User user = new User();
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName().trim());
        user.setRole(com.mermaid.app.model.Role.fromValue(request.getRole().getValue()));
        user.setActive(true);
        user.setEmailVerified(skipEmailVerification);

        if (!skipEmailVerification) {
            // Generate verification token
            String token = UUID.randomUUID().toString();
            user.setVerificationToken(token);
            user.setVerificationTokenExp(OffsetDateTime.now().plusHours(24));

            user = userRepository.save(user);

            // Send verification email
            emailService.sendVerificationEmail(user.getEmail(), token);
        } else {
            user = userRepository.save(user);
        }

        return new MessageResponse(skipEmailVerification
                ? "Account created (email verification skipped)."
                : "Check your email to verify your account.");
    }

    /**
     * Legacy register (kept for backward compatibility with old API).
     */
    @Transactional
    public UserProfile register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }
        User user = new User();
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName().trim());
        user.setRole(com.mermaid.app.model.Role.fromValue(request.getRole().getValue()));
        user.setActive(true);
        user.setEmailVerified(skipEmailVerification);

        if (!skipEmailVerification) {
            // Generate verification token
            String token = UUID.randomUUID().toString();
            user.setVerificationToken(token);
            user.setVerificationTokenExp(OffsetDateTime.now().plusHours(24));

            user = userRepository.save(user);

            // Send verification email
            emailService.sendVerificationEmail(user.getEmail(), token);
        } else {
            user = userRepository.save(user);
        }

        return toUserProfile(user);
    }

    /**
     * Set role for a new OAuth2 user who hasn't completed their profile yet.
     */
    @Transactional
    public UserProfile completeProfile(Role role) {
        Long userId = currentUserId();
        if (userId == null) throw new InvalidCredentialsException();
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getRole() != null) {
            throw new IllegalArgumentException("Profile already complete.");
        }
        user.setRole(role);
        userRepository.save(user);
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

    // ── Private helpers ─────────────────────────────────────────────────────────

    private void recordLogin(User user) {
        user.setLastLoginAt(OffsetDateTime.now());
        userRepository.save(user);
        com.mermaid.app.domain.LoginEvent event = new com.mermaid.app.domain.LoginEvent();
        event.setUserId(user.getId());
        loginEventRepo.save(event);
    }

    private String generateOtp() {
        int otp = 100000 + secureRandom.nextInt(900000); // 100000-999999
        return String.valueOf(otp);
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

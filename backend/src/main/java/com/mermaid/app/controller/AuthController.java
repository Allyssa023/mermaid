package com.mermaid.app.controller;

import com.mermaid.app.api.AuthApi;
import com.mermaid.app.model.*;
import com.mermaid.app.service.AuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController implements AuthApi {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public ResponseEntity<LoginResponse> login(LoginRequest loginRequest) {
        LoginResponse response = authService.login(loginRequest);

        // If OTP is required, don't set a cookie yet — just return the response
        if (Boolean.TRUE.equals(response.getOtpRequired())) {
            return ResponseEntity.ok(response);
        }

        // Normal login — set JWT cookie
        boolean rememberMe = Boolean.TRUE.equals(loginRequest.getRememberMe());
        long maxAge = rememberMe ? 2592000L : -1L; // 30 days or session

        ResponseCookie jwtCookie = ResponseCookie.from("jwt", response.getAccessToken())
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                .body(response);
    }

    @Override
    public ResponseEntity<UserProfile> register(RegisterRequest registerRequest) {
        UserProfile profile = authService.register(registerRequest);
        return ResponseEntity.status(201).body(profile);
    }

    @Override
    public ResponseEntity<MessageResponse> registerWithMessage(RegisterRequest registerRequest) {
        MessageResponse response = authService.registerWithVerification(registerRequest);
        return ResponseEntity.status(201).body(response);
    }

    @Override
    public ResponseEntity<UserProfile> completeProfile(com.mermaid.app.model.CompleteProfileRequest request) {
        UserProfile profile = authService.completeProfile(request.getRole());
        return ResponseEntity.ok(profile);
    }

    @Override
    public ResponseEntity<UserProfile> getCurrentUser() {
        UserProfile profile = authService.getCurrentUser();
        return ResponseEntity.ok(profile);
    }

    @Override
    public ResponseEntity<LoginResponse> verifyEmail(VerifyEmailRequest verifyEmailRequest) {
        LoginResponse response = authService.verifyEmail(verifyEmailRequest.getToken());

        ResponseCookie jwtCookie = ResponseCookie.from("jwt", response.getAccessToken())
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(response.getExpiresIn())
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                .body(response);
    }

    @Override
    public ResponseEntity<MessageResponse> forgotPassword(ForgotPasswordRequest forgotPasswordRequest) {
        MessageResponse response = authService.forgotPassword(forgotPasswordRequest.getEmail());
        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<MessageResponse> resetPassword(ResetPasswordRequest resetPasswordRequest) {
        MessageResponse response = authService.resetPassword(
                resetPasswordRequest.getToken(),
                resetPasswordRequest.getNewPassword()
        );
        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<LoginResponse> verifyOtp(VerifyOtpRequest verifyOtpRequest) {
        LoginResponse response = authService.verifyOtp(
                verifyOtpRequest.getEmail(),
                verifyOtpRequest.getCode()
        );

        ResponseCookie jwtCookie = ResponseCookie.from("jwt", response.getAccessToken())
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(response.getExpiresIn())
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                .body(response);
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout() {
        ResponseCookie jwtCookie = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                .build();
    }
}

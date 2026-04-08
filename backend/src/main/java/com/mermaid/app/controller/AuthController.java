package com.mermaid.app.controller;

import com.mermaid.app.api.AuthApi;
import com.mermaid.app.model.LoginRequest;
import com.mermaid.app.model.LoginResponse;
import com.mermaid.app.model.RegisterRequest;
import com.mermaid.app.model.UserProfile;
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
        
        ResponseCookie jwtCookie = ResponseCookie.from("jwt", response.getAccessToken())
                .httpOnly(true)
                .secure(false) // Assuming false for local dev
                .path("/")
                .maxAge(response.getExpiresIn())
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
    public ResponseEntity<UserProfile> getCurrentUser() {
        UserProfile profile = authService.getCurrentUser();
        return ResponseEntity.ok(profile);
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

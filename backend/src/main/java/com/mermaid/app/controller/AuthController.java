package com.mermaid.app.controller;

import com.mermaid.app.api.AuthApi;
import com.mermaid.app.model.LoginRequest;
import com.mermaid.app.model.LoginResponse;
import com.mermaid.app.model.RegisterRequest;
import com.mermaid.app.model.UserProfile;
import com.mermaid.app.service.AuthService;
import org.springframework.http.ResponseEntity;
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
        return ResponseEntity.ok(response);
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
}

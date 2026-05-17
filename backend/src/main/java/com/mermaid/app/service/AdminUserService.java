package com.mermaid.app.service;

import com.mermaid.app.domain.User;
import com.mermaid.app.exception.EmailAlreadyExistsException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.Role;
import com.mermaid.app.model.UserCreateRequest;
import com.mermaid.app.model.UserSummary;
import com.mermaid.app.model.UserUpdateRequest;
import com.mermaid.app.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Admin-only user management. Callers must be authorized as ADMIN (enforced at controller).
 */
@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLog;

    public AdminUserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditLogService auditLog) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLog = auditLog;
    }

    @Transactional(readOnly = true)
    public List<UserSummary> listUsers() {
        return userRepository.findAll().stream()
            .map(AdminUserService::toUserSummary)
            .collect(Collectors.toList());
    }

    @Transactional
    public UserSummary createUser(UserCreateRequest request) {
        if (userRepository.existsByEmail(request.getEmail().trim())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }
        User user = new User();
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName().trim());
        user.setRole(request.getRole());
        user.setActive(true);
        user = userRepository.save(user);
        return toUserSummary(user);
    }

    @Transactional(readOnly = true)
    public UserSummary getUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        return toUserSummary(user);
    }

    @Transactional
    public UserSummary updateUser(Long userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        if (request.getActive() != null) {
            boolean wasActive = user.isActive();
            user.setActive(request.getActive());
            if (wasActive != request.getActive()) {
                String action = request.getActive() ? "reactivated user" : "deactivated user";
                auditLog.write(null, "Admin", "user", action, user.getFullName() + " (id " + userId + ")");
            }
        }
        user = userRepository.save(user);
        return toUserSummary(user);
    }

    private static UserSummary toUserSummary(User user) {
        UserSummary s = new UserSummary(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
        s.setActive(user.isActive());
        s.setCreatedAt(org.openapitools.jackson.nullable.JsonNullable.of(user.getCreatedAt()));
        s.setLastLoginAt(org.openapitools.jackson.nullable.JsonNullable.of(user.getLastLoginAt()));
        return s;
    }
}

package com.mermaid.app.service;

import com.mermaid.app.domain.User;
import com.mermaid.app.model.Role;
import com.mermaid.app.model.UserSummary;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock UserRepository userRepository;
    @Mock org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Mock AuditLogService auditLog;
    @InjectMocks AdminUserService service;

    @Test
    void listUsers_includesCreatedAtAndLastLoginAt() {
        User u = new User();
        u.setId(1L);
        u.setFullName("Test User");
        u.setEmail("test@test.com");
        u.setRole(Role.FISHERMAN);
        u.setActive(true);
        OffsetDateTime created = OffsetDateTime.parse("2025-08-12T00:00:00+08:00");
        OffsetDateTime lastLogin = OffsetDateTime.parse("2026-05-18T08:00:00+08:00");
        u.setCreatedAt(created);
        u.setLastLoginAt(lastLogin);

        when(userRepository.findAll()).thenReturn(List.of(u));

        List<UserSummary> result = service.listUsers();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCreatedAt().get()).isEqualTo(created);
        assertThat(result.get(0).getLastLoginAt().get()).isEqualTo(lastLogin);
    }
}

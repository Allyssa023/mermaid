package com.mermaid.app.repository;

import com.mermaid.app.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByVerificationToken(String verificationToken);

    Optional<User> findByResetToken(String resetToken);

    Optional<User> findByGoogleId(String googleId);

    Optional<User> findByFacebookId(String facebookId);

    long countByRole(com.mermaid.app.model.Role role);

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt > :cutoff")
    long countCreatedAfter(@Param("cutoff") java.time.OffsetDateTime cutoff);

    @Query("SELECT COUNT(u) FROM User u WHERE u.lastLoginAt > :cutoff")
    long countLastLoginAfter(@Param("cutoff") java.time.OffsetDateTime cutoff);
}

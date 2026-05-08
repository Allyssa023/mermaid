package com.mermaid.app.domain;

import com.mermaid.app.model.Role;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.Objects;

/**
 * Persistent user entity. Stored in {@code users} table.
 * Never expose {@link #passwordHash} in API responses; map to UserProfile/UserSummary instead.
 */
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_users_email", columnList = "email"),
    @Index(name = "idx_users_role", columnList = "role")
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Email
    @Size(max = 255)
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @NotNull
    @Size(min = 1, max = 200)
    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private Role role;

    @NotNull
    @Column(nullable = false)
    private boolean active = true;

    @NotNull
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @NotNull
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    // ── Auth verification fields (Phase 3) ──────────────────────────────────────

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "verification_token", length = 128)
    private String verificationToken;

    @Column(name = "verification_token_exp")
    private OffsetDateTime verificationTokenExp;

    @Column(name = "reset_token", length = 128)
    private String resetToken;

    @Column(name = "reset_token_exp")
    private OffsetDateTime resetTokenExp;

    @Column(name = "otp_code", length = 6)
    private String otpCode;

    @Column(name = "otp_code_exp")
    private OffsetDateTime otpCodeExp;

    // ── Social OAuth fields (Phase 5+6) ─────────────────────────────────────────

    @Column(name = "google_id", length = 255, unique = true)
    private String googleId;

    @Column(name = "facebook_id", length = 255, unique = true)
    private String facebookId;

    // ── Vendor review aggregates (Phase 2.2) ────────────────────────────────────

    @Column(name = "avg_rating", precision = 3, scale = 2)
    private java.math.BigDecimal avgRating;

    @Column(name = "review_count", nullable = false)
    private int reviewCount = 0;

    // ── File upload fields (Phase 3.3) ───────────────────────────────────────────

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    public java.math.BigDecimal getAvgRating() { return avgRating; }
    public void setAvgRating(java.math.BigDecimal avgRating) { this.avgRating = avgRating; }
    public int getReviewCount() { return reviewCount; }
    public void setReviewCount(int reviewCount) { this.reviewCount = reviewCount; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    @Column(name = "vessel_name", length = 100)
    private String vesselName;

    @Column(name = "landing_site", length = 100)
    private String landingSite;

    @Column(name = "emergency_contact_name", length = 100)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 20)
    private String emergencyContactPhone;

    public String getVesselName() { return vesselName; }
    public void setVesselName(String vesselName) { this.vesselName = vesselName; }
    public String getLandingSite() { return landingSite; }
    public void setLandingSite(String landingSite) { this.landingSite = landingSite; }
    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }
    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }

    // ── Lifecycle callbacks ──────────────────────────────────────────────────────

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    // ── Getters and setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    /** BCrypt hash; never expose in API. */
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

    public String getVerificationToken() { return verificationToken; }
    public void setVerificationToken(String verificationToken) { this.verificationToken = verificationToken; }

    public OffsetDateTime getVerificationTokenExp() { return verificationTokenExp; }
    public void setVerificationTokenExp(OffsetDateTime verificationTokenExp) { this.verificationTokenExp = verificationTokenExp; }

    public String getResetToken() { return resetToken; }
    public void setResetToken(String resetToken) { this.resetToken = resetToken; }

    public OffsetDateTime getResetTokenExp() { return resetTokenExp; }
    public void setResetTokenExp(OffsetDateTime resetTokenExp) { this.resetTokenExp = resetTokenExp; }

    public String getOtpCode() { return otpCode; }
    public void setOtpCode(String otpCode) { this.otpCode = otpCode; }

    public OffsetDateTime getOtpCodeExp() { return otpCodeExp; }
    public void setOtpCodeExp(OffsetDateTime otpCodeExp) { this.otpCodeExp = otpCodeExp; }

    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }

    public String getFacebookId() { return facebookId; }
    public void setFacebookId(String facebookId) { this.facebookId = facebookId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

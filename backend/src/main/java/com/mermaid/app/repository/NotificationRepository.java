package com.mermaid.app.repository;

import com.mermaid.app.domain.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<Notification> findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndReadAtIsNull(Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = :now WHERE n.userId = :userId AND n.readAt IS NULL")
    int markAllReadByUserId(Long userId, OffsetDateTime now);

    @Query(value = "SELECT COUNT(*) > 0 FROM notifications " +
                   "WHERE user_id = :vendorId AND type = 'LOW_STOCK' " +
                   "AND created_at > :since " +
                   "AND (payload_json::jsonb)->>'speciesId' = CAST(:speciesId AS text)",
           nativeQuery = true)
    boolean existsRecentLowStock(@Param("vendorId") Long vendorId,
                                 @Param("speciesId") Long speciesId,
                                 @Param("since") OffsetDateTime since);

    @Query(value = "SELECT COUNT(*) > 0 FROM notifications " +
                   "WHERE user_id = :vendorId AND type = 'CATCH_ALERT_NEW' " +
                   "AND (payload_json::jsonb)->>'catchAlertId' = CAST(:catchAlertId AS text)",
           nativeQuery = true)
    boolean existsByCatchAlertNotification(@Param("vendorId") Long vendorId,
                                           @Param("catchAlertId") Long catchAlertId);
}

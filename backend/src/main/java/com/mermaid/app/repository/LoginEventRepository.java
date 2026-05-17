package com.mermaid.app.repository;

import com.mermaid.app.domain.LoginEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface LoginEventRepository extends JpaRepository<LoginEvent, Long> {

    @Query(value = """
        SELECT DATE(logged_in_at AT TIME ZONE 'UTC') AS day,
               COUNT(DISTINCT user_id) AS cnt
        FROM login_events
        WHERE logged_in_at >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY 1
        ORDER BY 1
        """, nativeQuery = true)
    List<Object[]> findDailyDistinctUserCounts();
}

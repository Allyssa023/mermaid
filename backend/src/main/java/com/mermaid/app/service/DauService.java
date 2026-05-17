package com.mermaid.app.service;

import com.mermaid.app.model.AdminDauEntry;
import com.mermaid.app.repository.LoginEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DauService {

    private final LoginEventRepository repo;

    public DauService(LoginEventRepository repo) { this.repo = repo; }

    @Transactional(readOnly = true)
    public List<AdminDauEntry> getLast30Days() {
        List<Object[]> rows = repo.findDailyDistinctUserCounts();
        Map<LocalDate, Integer> byDate = rows.stream().collect(Collectors.toMap(
            r -> ((Date) r[0]).toLocalDate(),
            r -> ((Number) r[1]).intValue()
        ));

        LocalDate today = LocalDate.now();
        List<AdminDauEntry> result = new ArrayList<>(30);
        for (int i = 29; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            AdminDauEntry entry = new AdminDauEntry();
            entry.setDate(day);
            entry.setCount(byDate.getOrDefault(day, 0));
            result.add(entry);
        }
        return result;
    }
}

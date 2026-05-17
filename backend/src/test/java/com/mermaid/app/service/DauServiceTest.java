package com.mermaid.app.service;

import com.mermaid.app.model.AdminDauEntry;
import com.mermaid.app.repository.LoginEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DauServiceTest {

    @Mock LoginEventRepository repo;
    @InjectMocks DauService service;

    @Test
    void getLast30Days_fillsMissingDaysWithZero() {
        LocalDate today = LocalDate.now();
        List<Object[]> rows = new java.util.ArrayList<>();
        rows.add(new Object[]{Date.valueOf(today), 42L});
        when(repo.findDailyDistinctUserCounts()).thenReturn(rows);

        List<AdminDauEntry> result = service.getLast30Days();

        assertThat(result).hasSize(30);
        AdminDauEntry todayEntry = result.get(result.size() - 1);
        assertThat(todayEntry.getCount()).isEqualTo(42);
        assertThat(result.get(0).getCount()).isEqualTo(0);
    }
}

package com.mermaid.app.service;

import com.mermaid.app.domain.AuditLog;
import com.mermaid.app.model.AuditEntry;
import com.mermaid.app.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock AuditLogRepository repo;
    @InjectMocks AuditLogService service;

    @Test
    void write_savesEntity() {
        service.write(1L, "Liza Domingo", "advisory", "created advisory", "TD Emong");
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(repo).save(captor.capture());
        AuditLog saved = captor.getValue();
        assertThat(saved.getActorId()).isEqualTo(1L);
        assertThat(saved.getActorName()).isEqualTo("Liza Domingo");
        assertThat(saved.getKind()).isEqualTo("advisory");
        assertThat(saved.getAction()).isEqualTo("created advisory");
        assertThat(saved.getTarget()).isEqualTo("TD Emong");
    }

    @Test
    void write_doesNotThrowOnRepoFailure() {
        doThrow(new RuntimeException("DB down")).when(repo).save(any());
        service.write(1L, "Admin", "system", "test", "test");
    }

    @Test
    void list_allKind_callsTop200() {
        AuditLog entry = makeEntry();
        when(repo.findTop200ByOrderByCreatedAtDesc()).thenReturn(List.of(entry));
        List<AuditEntry> result = service.list("all");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getActorName()).isEqualTo("Liza");
    }

    @Test
    void list_specificKind_filtersInRepo() {
        when(repo.findTop200ByKindOrderByCreatedAtDesc("advisory")).thenReturn(List.of());
        service.list("advisory");
        verify(repo).findTop200ByKindOrderByCreatedAtDesc("advisory");
    }

    private AuditLog makeEntry() {
        AuditLog a = new AuditLog();
        a.setActorId(1L); a.setActorName("Liza"); a.setKind("advisory");
        a.setAction("created"); a.setTarget("T1");
        // createdAt set by @PrePersist in production; left null in unit test
        return a;
    }
}

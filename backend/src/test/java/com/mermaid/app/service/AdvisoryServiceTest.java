package com.mermaid.app.service;

import com.mermaid.app.domain.Advisory;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.AdvisoryMapper;
import com.mermaid.app.model.AdvisoryCreateRequest;
import com.mermaid.app.model.AdvisoryUpdateRequest;
import com.mermaid.app.model.Severity;
import com.mermaid.app.repository.AdvisoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdvisoryServiceTest {

    @Mock AdvisoryRepository repo;
    @Mock AdvisoryMapper mapper;
    @Mock AuditLogService auditLog;
    @InjectMocks AdvisoryService service;

    @Test
    void create_whenActiveToNotAfterActiveFrom_throwsIllegalArgument() {
        OffsetDateTime now = OffsetDateTime.now();
        AdvisoryCreateRequest request = new AdvisoryCreateRequest(
            "Flood Warning", "Avoid low-lying areas",
            Severity.HIGH, "Manila Bay",
            now.plusDays(5),   // activeFrom
            now.plusDays(1)    // activeTo — BEFORE activeFrom
        );

        assertThrows(IllegalArgumentException.class, () -> service.create(request, 1L));
        verify(repo, never()).save(any());
    }

    @Test
    void create_whenDatesValid_savesAndReturnsModel() {
        OffsetDateTime now = OffsetDateTime.now();
        AdvisoryCreateRequest request = new AdvisoryCreateRequest(
            "Storm Warning", "Expect rough seas",
            Severity.HIGH, "Visayan Sea",
            now, now.plusDays(3)
        );
        Advisory saved = advisoryEntity(1L, Severity.HIGH);
        com.mermaid.app.model.Advisory model = advisoryModel(1L, Severity.HIGH);
        when(repo.save(any())).thenReturn(saved);
        when(mapper.toModel(saved)).thenReturn(model);

        com.mermaid.app.model.Advisory result = service.create(request, 42L);

        assertNotNull(result);
        verify(repo).save(any());
    }

    @Test
    void listActive_filtersBySeverity() {
        Advisory low = advisoryEntity(1L, Severity.LOW);
        Advisory high = advisoryEntity(2L, Severity.HIGH);
        when(repo.findActive(any())).thenReturn(List.of(low, high));
        when(mapper.toModel(high)).thenReturn(advisoryModel(2L, Severity.HIGH));

        List<com.mermaid.app.model.Advisory> result = service.listActive(Severity.HIGH);

        assertEquals(1, result.size());
        verify(mapper, never()).toModel(low);
    }

    @Test
    void listActive_noFilter_returnsAll() {
        Advisory a1 = advisoryEntity(1L, Severity.LOW);
        Advisory a2 = advisoryEntity(2L, Severity.HIGH);
        when(repo.findActive(any())).thenReturn(List.of(a1, a2));
        when(mapper.toModel(any())).thenReturn(advisoryModel(1L, Severity.LOW));

        List<com.mermaid.app.model.Advisory> result = service.listActive(null);

        assertEquals(2, result.size());
    }

    @Test
    void update_appliesOnlyNonNullFields() {
        Advisory entity = advisoryEntity(1L, Severity.LOW);
        entity.setTitle("Old Title");
        entity.setMessage("Old Message");
        when(repo.findById(1L)).thenReturn(Optional.of(entity));
        when(repo.save(entity)).thenReturn(entity);
        when(mapper.toModel(entity)).thenReturn(advisoryModel(1L, Severity.LOW));

        AdvisoryUpdateRequest request = new AdvisoryUpdateRequest();
        request.setTitle("New Title");
        // message intentionally not set — must remain "Old Message"

        service.update(1L, request);

        assertEquals("New Title", entity.getTitle());
        assertEquals("Old Message", entity.getMessage());
    }

    @Test
    void listAll_returnsActiveAndInactiveAdvisories() {
        Advisory active = advisoryEntity(1L, Severity.HIGH);
        active.setActive(true);
        Advisory inactive = advisoryEntity(2L, Severity.LOW);
        inactive.setActive(false);
        when(repo.findAllOrderByCreatedAtDesc()).thenReturn(List.of(active, inactive));
        when(mapper.toModel(any())).thenAnswer(inv -> {
            Advisory e = inv.getArgument(0);
            return new com.mermaid.app.model.Advisory(
                e.getId(), e.getTitle(), e.getMessage(),
                e.getSeverity(), e.getAffectedArea(),
                e.getActiveFrom(), e.getActiveTo(), e.isActive());
        });

        List<com.mermaid.app.model.Advisory> result = service.listAll();

        assertEquals(2, result.size());
        assertTrue(result.get(0).getIsActive());
        assertFalse(result.get(1).getIsActive());
    }

    @Test
    void update_notFound_throwsResourceNotFoundException() {
        when(repo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
            () -> service.update(99L, new AdvisoryUpdateRequest()));
    }

    @Test
    void delete_setsActiveFalse_neverHardDeletes() {
        Advisory entity = advisoryEntity(1L, Severity.HIGH);
        when(repo.findById(1L)).thenReturn(Optional.of(entity));

        service.delete(1L);

        assertFalse(entity.isActive());
        verify(repo).save(entity);
        verify(repo, never()).deleteById(any());
        verify(repo, never()).delete(any());
    }

    @Test
    void delete_notFound_throwsResourceNotFoundException() {
        when(repo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.delete(99L));
        verify(repo, never()).deleteById(any());
    }

    // --- helpers ---

    private Advisory advisoryEntity(Long id, Severity severity) {
        Advisory e = new Advisory();
        e.setId(id);
        e.setTitle("Test Advisory");
        e.setMessage("Test message content");
        e.setSeverity(severity);
        e.setAffectedArea("Manila Bay");
        e.setActiveFrom(OffsetDateTime.now().minusHours(1));
        e.setActiveTo(OffsetDateTime.now().plusDays(2));
        e.setActive(true);
        return e;
    }

    private com.mermaid.app.model.Advisory advisoryModel(Long id, Severity severity) {
        return new com.mermaid.app.model.Advisory(
            id, "Test Advisory", "Test message content",
            severity, "Manila Bay",
            OffsetDateTime.now().minusHours(1), OffsetDateTime.now().plusDays(2), true);
    }
}

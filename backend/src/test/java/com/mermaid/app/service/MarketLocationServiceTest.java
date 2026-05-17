package com.mermaid.app.service;

import com.mermaid.app.domain.MarketLocation;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.MarketLocationMapper;
import com.mermaid.app.model.MarketLocationCreateRequest;
import com.mermaid.app.repository.MarketLocationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketLocationServiceTest {

    @Mock MarketLocationRepository repo;
    @Mock MarketLocationMapper mapper;
    @Mock AuditLogService auditLog;
    @InjectMocks MarketLocationService service;

    @Test
    void listActive_delegatesRepoAndMapsResults() {
        MarketLocation entity = locationEntity(1L, "Navotas Fish Port");
        com.mermaid.app.model.MarketLocation model = locationModel(1L, "Navotas Fish Port");
        when(repo.findAllByActiveTrue()).thenReturn(List.of(entity));
        when(mapper.toModel(entity)).thenReturn(model);

        List<com.mermaid.app.model.MarketLocation> result = service.listActive();

        assertEquals(1, result.size());
        assertEquals("Navotas Fish Port", result.get(0).getName());
    }

    @Test
    void delete_setsActiveFalse_neverHardDeletes() {
        MarketLocation entity = locationEntity(1L, "Navotas Fish Port");
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
    }

    @Test
    void update_notFound_throwsResourceNotFoundException() {
        when(repo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
            () -> service.update(99L, new MarketLocationCreateRequest("X", "Y")));
    }

    private MarketLocation locationEntity(Long id, String name) {
        MarketLocation e = new MarketLocation();
        e.setId(id);
        e.setName(name);
        e.setMunicipality("Navotas");
        e.setActive(true);
        return e;
    }

    private com.mermaid.app.model.MarketLocation locationModel(Long id, String name) {
        return new com.mermaid.app.model.MarketLocation(id, name, "Navotas", true);
    }
}

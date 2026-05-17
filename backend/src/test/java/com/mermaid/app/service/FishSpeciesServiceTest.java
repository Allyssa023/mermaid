package com.mermaid.app.service;

import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.FishSpeciesMapper;
import com.mermaid.app.model.FishSpeciesCreateRequest;
import com.mermaid.app.repository.FishSpeciesRepository;
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
class FishSpeciesServiceTest {

    @Mock FishSpeciesRepository repo;
    @Mock FishSpeciesMapper mapper;
    @Mock AuditLogService auditLog;
    @InjectMocks FishSpeciesService service;

    @Test
    void listActive_delegatesRepoAndMapsResults() {
        FishSpecies entity = fishSpeciesEntity(1L, "Bangus");
        com.mermaid.app.model.FishSpecies model = fishSpeciesModel(1L, "Bangus");
        when(repo.findAllByActiveTrue()).thenReturn(List.of(entity));
        when(mapper.toModel(entity)).thenReturn(model);

        List<com.mermaid.app.model.FishSpecies> result = service.listActive();

        assertEquals(1, result.size());
        assertEquals("Bangus", result.get(0).getCommonName());
    }

    @Test
    void delete_setsActiveFalse_neverHardDeletes() {
        FishSpecies entity = fishSpeciesEntity(1L, "Bangus");
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
            () -> service.update(99L, new FishSpeciesCreateRequest("Updated")));
    }

    // --- helpers ---

    private FishSpecies fishSpeciesEntity(Long id, String name) {
        FishSpecies e = new FishSpecies();
        e.setId(id);
        e.setCommonName(name);
        e.setActive(true);
        return e;
    }

    private com.mermaid.app.model.FishSpecies fishSpeciesModel(Long id, String name) {
        return new com.mermaid.app.model.FishSpecies(id, name, true);
    }
}

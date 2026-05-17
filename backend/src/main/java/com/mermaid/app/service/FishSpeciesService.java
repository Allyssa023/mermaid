package com.mermaid.app.service;

import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.FishSpeciesMapper;
import com.mermaid.app.model.FishSpeciesCreateRequest;
import com.mermaid.app.repository.FishSpeciesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FishSpeciesService {

    private final FishSpeciesRepository repo;
    private final FishSpeciesMapper mapper;
    private final AuditLogService auditLog;

    public FishSpeciesService(FishSpeciesRepository repo, FishSpeciesMapper mapper, AuditLogService auditLog) {
        this.repo = repo;
        this.mapper = mapper;
        this.auditLog = auditLog;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.FishSpecies> listActive() {
        return repo.findAllByActiveTrue().stream()
            .map(mapper::toModel)
            .collect(Collectors.toList());
    }

    @Transactional
    public com.mermaid.app.model.FishSpecies create(FishSpeciesCreateRequest request) {
        FishSpecies entity = new FishSpecies();
        entity.setCommonName(request.getCommonName().trim());
        entity.setScientificName(request.getScientificName().orElse(null));
        com.mermaid.app.model.FishSpecies result = mapper.toModel(repo.save(entity));
        auditLog.write(null, "Admin", "lookup", "created species", request.getCommonName());
        return result;
    }

    @Transactional
    public com.mermaid.app.model.FishSpecies update(Long id, FishSpeciesCreateRequest request) {
        FishSpecies entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + id));
        entity.setCommonName(request.getCommonName().trim());
        entity.setScientificName(request.getScientificName().orElse(null));
        com.mermaid.app.model.FishSpecies result = mapper.toModel(repo.save(entity));
        auditLog.write(null, "Admin", "lookup", "updated species", request.getCommonName());
        return result;
    }

    @Transactional
    public void delete(Long id) {
        FishSpecies entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + id));
        entity.setActive(false);
        repo.save(entity);
        auditLog.write(null, "Admin", "lookup", "deactivated species", entity.getCommonName());
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.FishSpecies> listAll() {
        return repo.findAll().stream()
            .sorted(java.util.Comparator.comparing(FishSpecies::getCommonName))
            .map(mapper::toModel)
            .collect(Collectors.toList());
    }

    @Transactional
    public com.mermaid.app.model.FishSpecies reactivate(Long id) {
        FishSpecies entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + id));
        entity.setActive(true);
        com.mermaid.app.model.FishSpecies result = mapper.toModel(repo.save(entity));
        auditLog.write(null, "Admin", "lookup", "reactivated species", entity.getCommonName());
        return result;
    }
}

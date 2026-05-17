package com.mermaid.app.service;

import com.mermaid.app.domain.MarketLocation;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.MarketLocationMapper;
import com.mermaid.app.model.MarketLocationCreateRequest;
import com.mermaid.app.repository.MarketLocationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MarketLocationService {

    private final MarketLocationRepository repo;
    private final MarketLocationMapper mapper;
    private final AuditLogService auditLog;

    public MarketLocationService(MarketLocationRepository repo, MarketLocationMapper mapper, AuditLogService auditLog) {
        this.repo = repo;
        this.mapper = mapper;
        this.auditLog = auditLog;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.MarketLocation> listActive() {
        return repo.findAllByActiveTrue().stream()
            .map(mapper::toModel)
            .collect(Collectors.toList());
    }

    @Transactional
    public com.mermaid.app.model.MarketLocation create(MarketLocationCreateRequest request) {
        MarketLocation entity = new MarketLocation();
        entity.setName(request.getName().trim());
        entity.setMunicipality(request.getMunicipality().trim());
        entity.setProvince(request.getProvince() != null && request.getProvince().isPresent()
            ? request.getProvince().get() : null);
        com.mermaid.app.model.MarketLocation result = mapper.toModel(repo.save(entity));
        auditLog.write(null, "Admin", "lookup", "created location", request.getName());
        return result;
    }

    @Transactional
    public com.mermaid.app.model.MarketLocation update(Long id, MarketLocationCreateRequest request) {
        MarketLocation entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Market location not found: " + id));
        entity.setName(request.getName().trim());
        entity.setMunicipality(request.getMunicipality().trim());
        entity.setProvince(request.getProvince() != null && request.getProvince().isPresent()
            ? request.getProvince().get() : null);
        com.mermaid.app.model.MarketLocation result = mapper.toModel(repo.save(entity));
        auditLog.write(null, "Admin", "lookup", "updated location", request.getName());
        return result;
    }

    @Transactional
    public void delete(Long id) {
        MarketLocation entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Market location not found: " + id));
        entity.setActive(false);
        repo.save(entity);
        auditLog.write(null, "Admin", "lookup", "deactivated location", entity.getName());
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.MarketLocation> listAll() {
        return repo.findAll().stream()
            .sorted(java.util.Comparator.comparing(MarketLocation::getName))
            .map(mapper::toModel)
            .collect(Collectors.toList());
    }

    @Transactional
    public com.mermaid.app.model.MarketLocation reactivate(Long id) {
        MarketLocation entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Market location not found: " + id));
        entity.setActive(true);
        com.mermaid.app.model.MarketLocation result = mapper.toModel(repo.save(entity));
        auditLog.write(null, "Admin", "lookup", "reactivated location", entity.getName());
        return result;
    }
}

package com.mermaid.app.service;

import com.mermaid.app.domain.Advisory;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.AdvisoryMapper;
import com.mermaid.app.model.AdvisoryCreateRequest;
import com.mermaid.app.model.AdvisoryUpdateRequest;
import com.mermaid.app.model.Severity;
import com.mermaid.app.repository.AdvisoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdvisoryService {

    private final AdvisoryRepository repo;
    private final AdvisoryMapper mapper;
    private final AuditLogService auditLog;

    public AdvisoryService(AdvisoryRepository repo, AdvisoryMapper mapper, AuditLogService auditLog) {
        this.repo = repo;
        this.mapper = mapper;
        this.auditLog = auditLog;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.Advisory> listAll() {
        return repo.findAllOrderByCreatedAtDesc().stream()
            .map(mapper::toModel)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.Advisory> listActive(Severity severityFilter) {
        return repo.findActive(OffsetDateTime.now()).stream()
            .filter(a -> severityFilter == null || a.getSeverity() == severityFilter)
            .map(mapper::toModel)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public com.mermaid.app.model.Advisory getById(Long id) {
        Advisory entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Advisory not found: " + id));
        if (!entity.isActive()) {
            throw new ResourceNotFoundException("Advisory not found: " + id);
        }
        return mapper.toModel(entity);
    }

    @Transactional
    public com.mermaid.app.model.Advisory create(AdvisoryCreateRequest request, Long adminUserId) {
        if (!request.getActiveTo().isAfter(request.getActiveFrom())) {
            throw new IllegalArgumentException("activeTo must be after activeFrom");
        }
        Advisory entity = new Advisory();
        entity.setTitle(request.getTitle().trim());
        entity.setMessage(request.getMessage().trim());
        entity.setSeverity(request.getSeverity());
        entity.setAffectedArea(request.getAffectedArea().trim());
        entity.setActiveFrom(request.getActiveFrom());
        entity.setActiveTo(request.getActiveTo());
        entity.setActive(request.getIsActive() != null ? request.getIsActive() : true);
        entity.setCreatedByUserId(adminUserId);
        com.mermaid.app.model.Advisory result = mapper.toModel(repo.save(entity));
        auditLog.write(adminUserId, "Admin", "advisory", "created advisory", request.getTitle());
        return result;
    }

    @Transactional
    public com.mermaid.app.model.Advisory update(Long id, AdvisoryUpdateRequest request) {
        Advisory entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Advisory not found: " + id));
        if (request.getTitle() != null)       entity.setTitle(request.getTitle().trim());
        if (request.getMessage() != null)     entity.setMessage(request.getMessage().trim());
        if (request.getSeverity() != null)    entity.setSeverity(request.getSeverity());
        if (request.getAffectedArea() != null) entity.setAffectedArea(request.getAffectedArea().trim());
        if (request.getActiveFrom() != null)  entity.setActiveFrom(request.getActiveFrom());
        if (request.getActiveTo() != null)    entity.setActiveTo(request.getActiveTo());
        if (request.getIsActive() != null)    entity.setActive(request.getIsActive());
        com.mermaid.app.model.Advisory result = mapper.toModel(repo.save(entity));
        auditLog.write(null, "Admin", "advisory", "updated advisory", entity.getTitle());
        return result;
    }

    @Transactional
    public void delete(Long id) {
        Advisory entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Advisory not found: " + id));
        entity.setActive(false);
        repo.save(entity);
        auditLog.write(null, "Admin", "advisory", "deactivated advisory", entity.getTitle());
    }
}

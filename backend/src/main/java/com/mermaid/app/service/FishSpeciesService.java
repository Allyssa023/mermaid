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

    public FishSpeciesService(FishSpeciesRepository repo, FishSpeciesMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
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
        return mapper.toModel(repo.save(entity));
    }

    @Transactional
    public com.mermaid.app.model.FishSpecies update(Long id, FishSpeciesCreateRequest request) {
        FishSpecies entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + id));
        entity.setCommonName(request.getCommonName().trim());
        entity.setScientificName(request.getScientificName().orElse(null));
        return mapper.toModel(repo.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        FishSpecies entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + id));
        entity.setActive(false);
        repo.save(entity);
    }
}

package com.mermaid.app.service;

import com.mermaid.app.domain.BfarReferencePrice;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.BfarReferencePriceRepository;
import com.mermaid.app.repository.FishSpeciesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class BfarPriceService {

    private final BfarReferencePriceRepository repo;
    private final FishSpeciesRepository speciesRepo;

    public BfarPriceService(BfarReferencePriceRepository repo, FishSpeciesRepository speciesRepo) {
        this.repo = repo;
        this.speciesRepo = speciesRepo;
    }

    @Transactional(readOnly = true)
    public List<BfarReferencePrice> listAll() {
        return repo.findAllByOrderByEffectiveDateDesc();
    }

    @Transactional(readOnly = true)
    public List<BfarReferencePrice> listLatestPerSpecies() {
        return repo.findLatestPerSpecies();
    }

    @Transactional(readOnly = true)
    public Optional<BfarReferencePrice> getLatestForSpecies(Long speciesId) {
        List<BfarReferencePrice> prices = repo.findBySpeciesLatestFirst(speciesId);
        return prices.isEmpty() ? Optional.empty() : Optional.of(prices.get(0));
    }

    @Transactional
    public BfarReferencePrice create(Long speciesId, BigDecimal minPrice, BigDecimal maxPrice,
                                     String source, LocalDate effectiveDate, Long adminUserId) {
        FishSpecies species = speciesRepo.findById(speciesId)
                .orElseThrow(() -> new ResourceNotFoundException("Species not found: " + speciesId));

        BfarReferencePrice price = new BfarReferencePrice();
        price.setSpecies(species);
        price.setMinPricePerKg(minPrice);
        price.setMaxPricePerKg(maxPrice);
        if (source != null && !source.isBlank()) price.setSource(source);
        price.setEffectiveDate(effectiveDate);
        price.setCreatedBy(adminUserId);

        return repo.save(price);
    }

    @Transactional
    public BfarReferencePrice update(Long id, BigDecimal minPrice, BigDecimal maxPrice,
                                     String source, LocalDate effectiveDate) {
        BfarReferencePrice price = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BFAR price record not found: " + id));

        if (minPrice != null) price.setMinPricePerKg(minPrice);
        if (maxPrice != null) price.setMaxPricePerKg(maxPrice);
        if (source != null && !source.isBlank()) price.setSource(source);
        if (effectiveDate != null) price.setEffectiveDate(effectiveDate);

        return repo.save(price);
    }
}

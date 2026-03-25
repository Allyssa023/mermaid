package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.MarketLocation;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.DemandListingMapper;
import com.mermaid.app.model.DemandListingCreateRequest;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.model.DemandListingUpdateRequest;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.MarketLocationRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class DemandListingService {

    private final DemandListingRepository repo;
    private final DemandListingMapper mapper;
    private final FishSpeciesRepository speciesRepo;
    private final MarketLocationRepository locationRepo;
    private final UserRepository userRepo;

    public DemandListingService(DemandListingRepository repo,
                                 DemandListingMapper mapper,
                                 FishSpeciesRepository speciesRepo,
                                 MarketLocationRepository locationRepo,
                                 UserRepository userRepo) {
        this.repo = repo;
        this.mapper = mapper;
        this.speciesRepo = speciesRepo;
        this.locationRepo = locationRepo;
        this.userRepo = userRepo;
    }

    private String resolveVendorName(Long vendorId) {
        return userRepo.findById(vendorId).map(u -> u.getFullName()).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.DemandListing> listOwn(Long vendorId, DemandListingStatus statusFilter) {
        List<DemandListing> entities = statusFilter == null
            ? repo.findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(vendorId)
            : repo.findAllByVendorIdAndStatusAndIsDeletedFalseOrderByPostedAtDescIdDesc(vendorId, statusFilter);

        String vendorName = resolveVendorName(vendorId);

        return entities.stream()
            .map(e -> mapper.toModel(e, vendorName))
            .toList();
    }

    @Transactional
    public com.mermaid.app.model.DemandListing create(DemandListingCreateRequest request, Long vendorId) {
        FishSpecies species = speciesRepo.findById(request.getSpeciesId())
            .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + request.getSpeciesId()));
        MarketLocation location = locationRepo.findById(request.getLocationId())
            .orElseThrow(() -> new ResourceNotFoundException("Market location not found: " + request.getLocationId()));

        DemandListing entity = new DemandListing();
        entity.setVendorId(vendorId);
        entity.setSpecies(species);
        entity.setLocation(location);
        entity.setQuantityKg(BigDecimal.valueOf(request.getQuantityKg()));
        entity.setOfferPricePerKg(BigDecimal.valueOf(request.getOfferPricePerKg()));
        if (request.getNotes().isPresent())    entity.setNotes(request.getNotes().get());
        if (request.getNeededBy().isPresent()) entity.setNeededBy(request.getNeededBy().get());

        DemandListing saved = repo.save(entity);
        return mapper.toModel(saved, resolveVendorName(vendorId));
    }

    @Transactional(readOnly = true)
    public com.mermaid.app.model.DemandListing getById(Long listingId, Long vendorId) {
        DemandListing entity = repo.findByIdAndVendorIdAndIsDeletedFalse(listingId, vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Demand listing not found: " + listingId));
        return mapper.toModel(entity, resolveVendorName(vendorId));
    }

    @Transactional
    public com.mermaid.app.model.DemandListing update(Long listingId, Long vendorId,
                                                        DemandListingUpdateRequest request) {
        DemandListing entity = repo.findByIdAndVendorIdAndIsDeletedFalse(listingId, vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Demand listing not found: " + listingId));

        if (entity.getStatus() == DemandListingStatus.CLOSED) {
            throw new ListingClosedException(listingId);
        }

        if (request.getSpeciesId() != null) {
            FishSpecies species = speciesRepo.findById(request.getSpeciesId())
                .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + request.getSpeciesId()));
            entity.setSpecies(species);
        }
        if (request.getLocationId() != null) {
            MarketLocation location = locationRepo.findById(request.getLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Market location not found: " + request.getLocationId()));
            entity.setLocation(location);
        }
        if (request.getQuantityKg() != null)      entity.setQuantityKg(BigDecimal.valueOf(request.getQuantityKg()));
        if (request.getOfferPricePerKg() != null) entity.setOfferPricePerKg(BigDecimal.valueOf(request.getOfferPricePerKg()));
        if (request.getNotes().isPresent())        entity.setNotes(request.getNotes().get());
        if (request.getNeededBy().isPresent())     entity.setNeededBy(request.getNeededBy().get());

        DemandListing saved = repo.save(entity);
        return mapper.toModel(saved, resolveVendorName(vendorId));
    }

    @Transactional
    public void delete(Long listingId, Long vendorId) {
        DemandListing entity = repo.findByIdAndVendorIdAndIsDeletedFalse(listingId, vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Demand listing not found: " + listingId));
        entity.setDeleted(true);
        repo.save(entity);
    }

    @Transactional
    public com.mermaid.app.model.DemandListing close(Long listingId, Long vendorId) {
        DemandListing entity = repo.findByIdAndVendorIdAndIsDeletedFalse(listingId, vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Demand listing not found: " + listingId));

        String vendorName = resolveVendorName(vendorId);

        if (entity.getStatus() == DemandListingStatus.CLOSED) {
            // idempotent: already closed — return without saving (no updated_at bump)
            return mapper.toModel(entity, vendorName);
        }

        entity.setStatus(DemandListingStatus.CLOSED);
        return mapper.toModel(repo.save(entity), vendorName);
    }
}

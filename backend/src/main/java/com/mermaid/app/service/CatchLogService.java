package com.mermaid.app.service;

import com.mermaid.app.domain.CatchLog;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.Trip;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.mapper.CatchLogMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.CatchLogRepository;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.TripRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class CatchLogService {

    private final CatchLogRepository catchLogRepo;
    private final TripRepository tripRepo;
    private final CatchLogMapper catchLogMapper;
    private final FishSpeciesRepository speciesRepo;
    private final DemandListingRepository listingRepo;

    public CatchLogService(CatchLogRepository catchLogRepo,
                           TripRepository tripRepo,
                           CatchLogMapper catchLogMapper,
                           FishSpeciesRepository speciesRepo,
                           DemandListingRepository listingRepo) {
        this.catchLogRepo = catchLogRepo;
        this.tripRepo = tripRepo;
        this.catchLogMapper = catchLogMapper;
        this.speciesRepo = speciesRepo;
        this.listingRepo = listingRepo;
    }

    /** Ownership + ACTIVE guard combined — used by create/update/delete. */
    private Trip getOwnedActiveTrip(Long tripId, Long fishermanId) {
        Trip trip = tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));
        if (trip.getStatus() != TripStatus.ACTIVE) {
            throw new TripNotActiveException(tripId);
        }
        return trip;
    }

    /** Ownership + COMPLETED guard — settlement only valid after trip ends. */
    private Trip getOwnedCompletedTrip(Long tripId, Long fishermanId) {
        Trip trip = tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));
        if (trip.getStatus() != TripStatus.COMPLETED) {
            throw new IllegalArgumentException("Trip " + tripId + " must be completed before settling a catch.");
        }
        return trip;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.CatchLog> listByTrip(Long tripId, Long fishermanId) {
        // Ownership check only — completed trips are readable
        tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));
        return catchLogRepo.findAllByTripIdOrderByLoggedAtDesc(tripId)
            .stream().map(catchLogMapper::toModel).toList();
    }

    @Transactional
    public com.mermaid.app.model.CatchLog create(Long tripId, CatchLogCreateRequest req, Long fishermanId) {
        getOwnedActiveTrip(tripId, fishermanId);

        FishSpecies species = speciesRepo.findById(req.getSpeciesId())
            .orElseThrow(() -> new ResourceNotFoundException("FishSpecies not found: " + req.getSpeciesId()));

        // Validate matchedListingId only if explicitly provided and non-null
        Long listingId = unwrap(req.getMatchedListingId());
        if (listingId != null) {
            listingRepo.findById(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("DemandListing not found: " + listingId));
        }

        CatchLog log = new CatchLog();
        log.setTripId(tripId);
        log.setSpecies(species);
        log.setQuantityEstimate(req.getQuantityEstimate());
        Double qtKg = unwrap(req.getQuantityKg());
        log.setQuantityKg(qtKg != null ? BigDecimal.valueOf(qtKg) : null);
        log.setEstimatedPricePerKg(req.getEstimatedPricePerKg() != null && req.getEstimatedPricePerKg().isPresent()
            ? BigDecimal.valueOf(req.getEstimatedPricePerKg().get()) : null);
        log.setMatchedListingId(listingId);
        log.setNotes(unwrap(req.getNotes()));

        return catchLogMapper.toModel(catchLogRepo.save(log));
    }

    @Transactional
    public com.mermaid.app.model.CatchLog update(Long tripId, Long catchId,
                                                   CatchLogUpdateRequest req, Long fishermanId) {
        getOwnedActiveTrip(tripId, fishermanId);

        CatchLog log = catchLogRepo.findByIdAndTripId(catchId, tripId)
            .orElseThrow(() -> new ResourceNotFoundException("CatchLog not found: " + catchId));

        if (req.getSpeciesId() != null) {
            FishSpecies species = speciesRepo.findById(req.getSpeciesId())
                .orElseThrow(() -> new ResourceNotFoundException("FishSpecies not found: " + req.getSpeciesId()));
            log.setSpecies(species);
        }
        if (req.getQuantityEstimate() != null && req.getQuantityEstimate().isPresent()) {
            log.setQuantityEstimate(req.getQuantityEstimate().get());
        }
        if (req.getQuantityKg() != null && req.getQuantityKg().isPresent()) {
            Double val = req.getQuantityKg().get();
            log.setQuantityKg(val != null ? BigDecimal.valueOf(val) : null);
        }
        if (req.getEstimatedPricePerKg() != null && req.getEstimatedPricePerKg().isPresent()) {
            Double price = req.getEstimatedPricePerKg().get();
            log.setEstimatedPricePerKg(price == null ? null : BigDecimal.valueOf(price));
        }
        // matchedListingId: JsonNullable.of(null) = clear; JsonNullable.of(id) = validate + set; undefined = leave
        if (req.getMatchedListingId() != null && req.getMatchedListingId().isPresent()) {
            Long newListingId = req.getMatchedListingId().get();
            if (newListingId != null) {
                listingRepo.findById(newListingId)
                    .orElseThrow(() -> new ResourceNotFoundException("DemandListing not found: " + newListingId));
            }
            log.setMatchedListingId(newListingId);
        }
        if (req.getNotes() != null && req.getNotes().isPresent()) {
            log.setNotes(req.getNotes().get());
        }

        return catchLogMapper.toModel(catchLogRepo.save(log));
    }

    @Transactional
    public void delete(Long tripId, Long catchId, Long fishermanId) {
        getOwnedActiveTrip(tripId, fishermanId);
        CatchLog log = catchLogRepo.findByIdAndTripId(catchId, tripId)
            .orElseThrow(() -> new ResourceNotFoundException("CatchLog not found: " + catchId));
        catchLogRepo.deleteById(log.getId());
    }

    @Transactional
    public com.mermaid.app.model.CatchLog settle(Long tripId, Long catchId, CatchLogSettleRequest req, Long fishermanId) {
        getOwnedCompletedTrip(tripId, fishermanId);

        CatchLog log = catchLogRepo.findByIdAndTripId(catchId, tripId)
            .orElseThrow(() -> new ResourceNotFoundException("CatchLog not found: " + catchId));

        log.setIsSettled(true);
        log.setSettledKg(BigDecimal.valueOf(req.getSettledKg()));
        log.setSettledPricePerKg(BigDecimal.valueOf(req.getSettledPricePerKg()));
        log.setSettledAt(OffsetDateTime.now());
        
        Long vendorId = unwrap(req.getVendorId());
        log.setSettledWithVendorId(vendorId);
        
        String buyerName = unwrap(req.getBuyerName());
        log.setBuyerName(buyerName);

        return catchLogMapper.toModel(catchLogRepo.save(log));
    }

    private static <T> T unwrap(JsonNullable<T> jn) {
        return (jn != null && jn.isPresent()) ? jn.get() : null;
    }
}

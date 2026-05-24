package com.mermaid.app.service;

import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.event.CatchAlertCreatedEvent;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.CatchAlertMapper;
import com.mermaid.app.model.CatchAlertCreateRequest;
import com.mermaid.app.repository.CatchAlertRepository;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class CatchAlertService {

    private final CatchAlertRepository alertRepo;
    private final FishSpeciesRepository speciesRepo;
    private final DemandListingRepository listingRepo;
    private final UserRepository userRepo;
    private final CatchAlertMapper mapper;
    private final ApplicationEventPublisher eventPublisher;
    private final LiveEventPublisher liveEventPublisher;

    public CatchAlertService(CatchAlertRepository alertRepo,
                              FishSpeciesRepository speciesRepo,
                              DemandListingRepository listingRepo,
                              UserRepository userRepo,
                              CatchAlertMapper mapper,
                              ApplicationEventPublisher eventPublisher,
                              LiveEventPublisher liveEventPublisher) {
        this.alertRepo = alertRepo;
        this.speciesRepo = speciesRepo;
        this.listingRepo = listingRepo;
        this.userRepo = userRepo;
        this.mapper = mapper;
        this.eventPublisher = eventPublisher;
        this.liveEventPublisher = liveEventPublisher;
    }

    private void broadcastAlertChange(CatchAlert alert, String reason) {
        if (alert == null) return;
        Long alertId = alert.getId();
        Long fishermanId = alert.getFishermanId();
        liveEventPublisher.runAfterCommit(() -> {
            liveEventPublisher.broadcast("catch-alerts", "CATCH_ALERT_CHANGED",
                java.util.Map.of("alertId", alertId, "reason", reason));
            if (fishermanId != null) {
                liveEventPublisher.pushToUser(fishermanId, "MY_CATCH_ALERT_CHANGED",
                    java.util.Map.of("alertId", alertId, "reason", reason));
            }
        });
    }

    private String resolveName(Long userId) {
        return userRepo.findById(userId).map(u -> u.getFullName()).orElse(null);
    }

    private List<Long> matchedListingIds(Long speciesId) {
        return listingRepo.findOpenListings(
                com.mermaid.app.model.DemandListingStatus.OPEN, speciesId, null, null, null)
            .stream().map(l -> l.getId()).toList();
    }

    @Transactional
    public com.mermaid.app.model.CatchAlert post(CatchAlertCreateRequest req, Long fishermanId) {
        FishSpecies species = speciesRepo.findById(req.getSpeciesId())
            .orElseThrow(() -> new ResourceNotFoundException("FishSpecies not found: " + req.getSpeciesId()));

        CatchAlert alert = new CatchAlert();
        alert.setFishermanId(fishermanId);
        alert.setSpecies(species);

        if (req.getCatchLogId() != null && req.getCatchLogId().isPresent()) {
            alert.setCatchLogId(req.getCatchLogId().get());
        }
        if (req.getQuantityEstimate() != null && req.getQuantityEstimate().isPresent()) {
            alert.setQuantityEstimate(req.getQuantityEstimate().get());
        }
        if (req.getQuantityKg() != null && req.getQuantityKg().isPresent() && req.getQuantityKg().get() != null) {
            alert.setQuantityKg(BigDecimal.valueOf(req.getQuantityKg().get()));
        }
        if (req.getLandingSite() != null && req.getLandingSite().isPresent()) {
            alert.setLandingSite(req.getLandingSite().get());
        }
        if (req.getAskingPricePerKg() != null && req.getAskingPricePerKg().isPresent() && req.getAskingPricePerKg().get() != null) {
            alert.setAskingPricePerKg(BigDecimal.valueOf(req.getAskingPricePerKg().get()));
        }
        if (req.getNotes() != null && req.getNotes().isPresent()) {
            alert.setNotes(req.getNotes().get());
        }

        int hours = req.getExpiresInHours() != null ? req.getExpiresInHours() : 4;
        alert.setExpiresAt(OffsetDateTime.now().plusHours(hours));

        CatchAlert saved = alertRepo.save(alert);
        eventPublisher.publishEvent(new CatchAlertCreatedEvent(saved.getId()));
        broadcastAlertChange(saved, "CREATED");
        List<Long> matched = matchedListingIds(species.getId());
        return mapper.toModel(saved, resolveName(fishermanId), matched);
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.CatchAlert> listMine(Long fishermanId) {
        String name = resolveName(fishermanId);
        return alertRepo.findAllByFishermanIdOrderByCreatedAtDesc(fishermanId)
            .stream()
            .map(a -> mapper.toModel(a, name, matchedListingIds(a.getSpecies().getId())))
            .toList();
    }

    @Transactional
    public com.mermaid.app.model.CatchAlert cancel(Long alertId, Long fishermanId) {
        CatchAlert alert = alertRepo.findByIdAndFishermanId(alertId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Catch alert not found: " + alertId));
        if ("CANCELLED".equals(alert.getStatus())) {
            throw new IllegalStateException("Catch alert is already cancelled");
        }
        alert.setStatus("CANCELLED");
        CatchAlert saved = alertRepo.save(alert);
        broadcastAlertChange(saved, "CANCELLED");
        return mapper.toModel(saved, resolveName(fishermanId), List.of());
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.CatchAlert> browse(Long speciesId) {
        List<CatchAlert> alerts = speciesId != null
            ? alertRepo.findAllBySpeciesIdAndStatus(speciesId, "ACTIVE")
            : alertRepo.findAllByStatusOrderByCreatedAtDesc("ACTIVE");
        return alerts.stream()
            .map(a -> mapper.toModel(a, resolveName(a.getFishermanId()), List.of()))
            .toList();
    }

    @Scheduled(fixedRate = 3_600_000)
    @Transactional
    public void expireStale() {
        alertRepo.expireStaleAlerts(OffsetDateTime.now());
    }
}

package com.mermaid.app.service;

import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.event.CatchAlertCreatedEvent;
import com.mermaid.app.repository.CatchAlertRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.Map;

@Component
public class CatchAlertFanoutService {

    private final CatchAlertRepository alertRepo;
    private final WatchlistService watchlistService;
    private final NotificationService notificationService;

    public CatchAlertFanoutService(CatchAlertRepository alertRepo,
                                   WatchlistService watchlistService,
                                   NotificationService notificationService) {
        this.alertRepo = alertRepo;
        this.watchlistService = watchlistService;
        this.notificationService = notificationService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void onCatchAlertCreated(CatchAlertCreatedEvent event) {
        CatchAlert alert = alertRepo.findById(event.catchAlertId()).orElse(null);
        if (alert == null || !"ACTIVE".equals(alert.getStatus())) return;

        List<Long> vendorIds = watchlistService.vendorsMatching(alert);
        String speciesName = alert.getSpecies() != null ? alert.getSpecies().getCommonName() : "Unknown";
        String body = speciesName + " landing"
            + (alert.getQuantityEstimate() != null ? " — " + alert.getQuantityEstimate() : "");

        String link = "/vendor/procurement?highlightAlertId=" + alert.getId();
        for (Long vendorId : vendorIds) {
            if (alreadyNotified(alert.getId(), vendorId)) continue;
            notificationService.create(vendorId, "CATCH_ALERT_NEW", body,
                Map.of("catchAlertId", alert.getId(),
                       "speciesId",   alert.getSpecies() != null ? alert.getSpecies().getId() : 0L,
                       "landingSite", alert.getLandingSite() != null ? alert.getLandingSite() : ""),
                link);
        }
    }

    private boolean alreadyNotified(Long alertId, Long vendorId) {
        return notificationService.existsByUserAndCatchAlertId(vendorId, alertId);
    }
}

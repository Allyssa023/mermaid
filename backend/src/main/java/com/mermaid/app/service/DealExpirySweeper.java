package com.mermaid.app.service;

import com.mermaid.app.domain.Deal;
import com.mermaid.app.domain.DealStatus;
import com.mermaid.app.exception.DealConflictException;
import com.mermaid.app.repository.DealRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Periodically cancels deals whose grace period has elapsed without an
 * agreement. Each expired deal is closed via {@link DealService#cancelDeal}
 * on behalf of the fisherman so the standard event/message pipeline fires.
 */
@Component
public class DealExpirySweeper {

    private static final Logger log = LoggerFactory.getLogger(DealExpirySweeper.class);
    static final String EXPIRY_REASON = "Deal window expired";

    private final DealRepository dealRepo;
    private final DealService dealService;

    public DealExpirySweeper(DealRepository dealRepo, DealService dealService) {
        this.dealRepo = dealRepo;
        this.dealService = dealService;
    }

    @Scheduled(fixedDelayString = "${mermaid.deals.expiry-sweep-ms:60000}")
    public void sweep() {
        List<Deal> expired = dealRepo.findExpired(OffsetDateTime.now());
        if (expired.isEmpty()) return;
        log.info("DealExpirySweeper: expiring {} stale deal(s)", expired.size());
        for (Deal d : expired) {
            try {
                dealService.expireDeal(d.getId(), EXPIRY_REASON);
            } catch (DealConflictException e) {
                // Already terminal — someone closed it between query and expire. Fine.
                log.debug("Deal {} already {} — skipping expiry", d.getId(), e.getMessage());
            } catch (RuntimeException e) {
                log.warn("Failed to expire deal {}: {}", d.getId(), e.getMessage());
            }
        }
    }
}

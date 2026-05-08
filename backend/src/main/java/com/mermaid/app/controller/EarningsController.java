package com.mermaid.app.controller;

import com.mermaid.app.api.FishermanEarningsApi;
import com.mermaid.app.model.EarningsLedgerRow;
import com.mermaid.app.model.EarningsSummary;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.EarningsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class EarningsController implements FishermanEarningsApi {

    private final EarningsService earningsService;

    public EarningsController(EarningsService earningsService) {
        this.earningsService = earningsService;
    }

    @Override
    public ResponseEntity<EarningsSummary> getFishermanEarningsSummary(LocalDate from, LocalDate to) {
        Long fid = SecurityUtils.currentUserId();
        return ResponseEntity.ok(earningsService.getSummary(fid, from, to));
    }

    @Override
    public ResponseEntity<List<EarningsLedgerRow>> getFishermanEarningsLedger(LocalDate from, LocalDate to) {
        Long fid = SecurityUtils.currentUserId();
        return ResponseEntity.ok(earningsService.getLedger(fid, from, to));
    }
}

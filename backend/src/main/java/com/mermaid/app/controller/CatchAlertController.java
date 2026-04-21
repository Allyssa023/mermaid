package com.mermaid.app.controller;

import com.mermaid.app.api.CatchAlertsApi;
import com.mermaid.app.model.CatchAlert;
import com.mermaid.app.model.CatchAlertCreateRequest;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.CatchAlertService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class CatchAlertController implements CatchAlertsApi {

    private final CatchAlertService service;

    public CatchAlertController(CatchAlertService service) {
        this.service = service;
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN')")
    public ResponseEntity<CatchAlert> postCatchAlert(CatchAlertCreateRequest request) {
        return ResponseEntity.status(201).body(service.post(request, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN')")
    public ResponseEntity<List<CatchAlert>> listMyCatchAlerts() {
        return ResponseEntity.ok(service.listMine(SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN')")
    public ResponseEntity<CatchAlert> cancelCatchAlert(Long alertId) {
        return ResponseEntity.ok(service.cancel(alertId, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<List<CatchAlert>> browseCatchAlerts(Long speciesId) {
        return ResponseEntity.ok(service.browse(speciesId));
    }
}

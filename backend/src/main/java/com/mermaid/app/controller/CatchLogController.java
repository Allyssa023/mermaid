package com.mermaid.app.controller;

import com.mermaid.app.api.CatchLogsApi;
import com.mermaid.app.model.*;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.CatchLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class CatchLogController implements CatchLogsApi {

    private final CatchLogService catchLogService;

    public CatchLogController(CatchLogService catchLogService) {
        this.catchLogService = catchLogService;
    }

    @Override
    public ResponseEntity<List<CatchLog>> listCatchLogsByTrip(Long tripId) {
        return ResponseEntity.ok(catchLogService.listByTrip(tripId, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<CatchLog> createCatchLog(Long tripId, CatchLogCreateRequest catchLogCreateRequest) {
        return ResponseEntity.status(201).body(
            catchLogService.create(tripId, catchLogCreateRequest, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<CatchLog> updateCatchLog(Long tripId, Long catchId,
                                                    CatchLogUpdateRequest catchLogUpdateRequest) {
        return ResponseEntity.ok(
            catchLogService.update(tripId, catchId, catchLogUpdateRequest, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<Void> deleteCatchLog(Long tripId, Long catchId) {
        catchLogService.delete(tripId, catchId, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }
}

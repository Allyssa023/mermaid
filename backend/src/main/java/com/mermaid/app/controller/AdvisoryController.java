package com.mermaid.app.controller;

import com.mermaid.app.api.AdvisoriesApi;
import com.mermaid.app.model.Advisory;
import com.mermaid.app.model.Severity;
import com.mermaid.app.service.AdvisoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AdvisoryController implements AdvisoriesApi {

    private final AdvisoryService advisoryService;

    public AdvisoryController(AdvisoryService advisoryService) {
        this.advisoryService = advisoryService;
    }

    @Override
    public ResponseEntity<List<Advisory>> listAdvisories(Boolean activeOnly, Severity severity) {
        boolean filterActive = activeOnly == null || activeOnly;
        List<Advisory> result = filterActive
            ? advisoryService.listActive(severity)
            : advisoryService.listAll();
        return ResponseEntity.ok(result);
    }
}

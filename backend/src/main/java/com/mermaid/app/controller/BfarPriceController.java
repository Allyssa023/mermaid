package com.mermaid.app.controller;

import com.mermaid.app.domain.BfarReferencePrice;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.BfarPriceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
public class BfarPriceController {

    private final BfarPriceService bfarPriceService;

    public BfarPriceController(BfarPriceService bfarPriceService) {
        this.bfarPriceService = bfarPriceService;
    }

    // ── Public lookup ──────────────────────────────────────────────────────────

    @GetMapping("/bfar-prices")
    public ResponseEntity<List<BfarReferencePrice>> listBfarPrices(
            @RequestParam(required = false) Long speciesId) {
        if (speciesId != null) {
            return ResponseEntity.ok(
                    bfarPriceService.getLatestForSpecies(speciesId)
                            .map(List::of).orElse(List.of())
            );
        }
        return ResponseEntity.ok(bfarPriceService.listLatestPerSpecies());
    }

    @GetMapping("/bfar-prices/all")
    public ResponseEntity<List<BfarReferencePrice>> listAllBfarPrices() {
        return ResponseEntity.ok(bfarPriceService.listAll());
    }

    // ── Admin CRUD ─────────────────────────────────────────────────────────────

    @PostMapping("/admin/bfar-prices")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BfarReferencePrice> createBfarPrice(@RequestBody Map<String, Object> body) {
        Long speciesId    = toLong(body.get("speciesId"));
        BigDecimal minPrice = toBigDecimal(body.get("minPricePerKg"));
        BigDecimal maxPrice = toBigDecimal(body.get("maxPricePerKg"));
        String source     = (String) body.get("source");
        LocalDate date    = body.get("effectiveDate") != null
                ? LocalDate.parse((String) body.get("effectiveDate")) : LocalDate.now();

        BfarReferencePrice created = bfarPriceService.create(
                speciesId, minPrice, maxPrice, source, date, SecurityUtils.currentUserId());
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/admin/bfar-prices/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BfarReferencePrice> updateBfarPrice(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        BigDecimal minPrice = toBigDecimal(body.get("minPricePerKg"));
        BigDecimal maxPrice = toBigDecimal(body.get("maxPricePerKg"));
        String source     = (String) body.get("source");
        LocalDate date    = body.get("effectiveDate") != null
                ? LocalDate.parse((String) body.get("effectiveDate")) : null;

        return ResponseEntity.ok(bfarPriceService.update(id, minPrice, maxPrice, source, date));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) return n.longValue();
        return Long.parseLong(val.toString());
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(val.toString());
    }
}

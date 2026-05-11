package com.mermaid.app.controller;

import com.mermaid.app.api.VendorPayoutsApi;
import com.mermaid.app.model.PayoutLedgerEntry;
import com.mermaid.app.model.PayoutSummary;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.PayoutsService;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@RestController
@PreAuthorize("hasRole('VENDOR')")
public class VendorPayoutsController implements VendorPayoutsApi {

    private final PayoutsService payoutsService;

    public VendorPayoutsController(PayoutsService payoutsService) {
        this.payoutsService = payoutsService;
    }

    @Override
    public ResponseEntity<PayoutSummary> vendorPayoutsSummary() {
        Long vendorId = SecurityUtils.currentUserId();
        Map<String, Object> data = payoutsService.summary(vendorId);
        PayoutSummary dto = new PayoutSummary(
            ((Number) data.get("pendingTotal")).doubleValue(),
            ((Number) data.get("paidTotal")).doubleValue()
        );
        return ResponseEntity.ok(dto);
    }

    @Override
    public ResponseEntity<List<PayoutLedgerEntry>> vendorPayoutsLedger(LocalDate from, LocalDate to) {
        Long vendorId = SecurityUtils.currentUserId();
        List<Map<String, Object>> data = payoutsService.ledger(vendorId, from, to);
        List<PayoutLedgerEntry> dtos = data.stream().map(m -> {
            // completedAt may be stored as OffsetDateTime or java.sql.Timestamp
            OffsetDateTime completedAt = null;
            Object rawCompletedAt = m.get("completedAt");
            if (rawCompletedAt instanceof OffsetDateTime odt) {
                completedAt = odt;
            } else if (rawCompletedAt instanceof java.sql.Timestamp ts) {
                completedAt = ts.toInstant().atOffset(ZoneOffset.UTC);
            }

            PayoutLedgerEntry entry = new PayoutLedgerEntry(
                ((Number) m.get("orderId")).longValue(),
                completedAt,
                ((Number) m.get("qtyKg")).doubleValue(),
                ((Number) m.get("gross")).doubleValue(),
                ((Number) m.get("fees")).doubleValue(),
                ((Number) m.get("net")).doubleValue(),
                (String) m.get("status")
            );
            entry.setBuyerName(JsonNullable.of((String) m.get("buyerName")));
            entry.setSpeciesName(JsonNullable.of((String) m.get("speciesName")));
            return entry;
        }).toList();
        return ResponseEntity.ok(dtos);
    }
}

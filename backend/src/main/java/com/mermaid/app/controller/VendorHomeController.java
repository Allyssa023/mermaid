package com.mermaid.app.controller;

import com.mermaid.app.api.VendorHomeApi;
import com.mermaid.app.model.LowStockItem;
import com.mermaid.app.model.OpenOrderBuckets;
import com.mermaid.app.model.RecentMatchedAlert;
import com.mermaid.app.model.VendorHomeSummary;
import com.mermaid.app.repository.NotificationRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.AnalyticsService;
import com.mermaid.app.service.InventoryService;
import com.mermaid.app.service.NotificationService;
import com.mermaid.app.service.VendorOrderService;
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
public class VendorHomeController implements VendorHomeApi {

    private final AnalyticsService analyticsService;
    private final VendorOrderService vendorOrderService;
    private final InventoryService inventoryService;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    public VendorHomeController(AnalyticsService analyticsService,
                                VendorOrderService vendorOrderService,
                                InventoryService inventoryService,
                                NotificationService notificationService,
                                NotificationRepository notificationRepository) {
        this.analyticsService = analyticsService;
        this.vendorOrderService = vendorOrderService;
        this.inventoryService = inventoryService;
        this.notificationService = notificationService;
        this.notificationRepository = notificationRepository;
    }

    @Override
    public ResponseEntity<VendorHomeSummary> vendorHome() {
        Long vendorId = SecurityUtils.currentUserId();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        // Today's revenue from completed retail orders
        Map<String, Object> salesData = analyticsService.salesSummary(vendorId, today, today);
        double todayRevenue = ((Number) salesData.get("totalRevenue")).doubleValue();

        // Open order counts by bucket
        int newCount      = vendorOrderService.listInbox(vendorId, "NEW", null).size();
        int preparingCount = vendorOrderService.listInbox(vendorId, "PREPARING", null).size();
        int readyCount    = vendorOrderService.listInbox(vendorId, "READY", null).size();
        OpenOrderBuckets buckets = new OpenOrderBuckets(newCount, preparingCount, readyCount);

        // Low-stock inventory items
        List<Map<String, Object>> lowStockData = inventoryService.lowStockItems(vendorId);
        List<LowStockItem> lowStock = lowStockData.stream().map(m -> new LowStockItem(
            ((Number) m.get("speciesId")).longValue(),
            (String) m.get("speciesName"),
            ((Number) m.get("availableKg")).doubleValue()
        )).toList();

        // Recent matched catch-alert notifications
        List<Object[]> alertRows = notificationRepository.findRecentCatchAlertNotifications(vendorId, 5);
        List<RecentMatchedAlert> recentAlerts = alertRows.stream().map(row -> {
            // row[0]=id, row[1]=catchAlertId (String from JSON), row[2]=speciesName, row[3]=fishermanName, row[4]=createdAt
            Long catchAlertId = row[1] instanceof String s
                ? Long.parseLong(s)
                : ((Number) row[1]).longValue();

            OffsetDateTime createdAt = null;
            if (row[4] instanceof java.sql.Timestamp ts) {
                createdAt = ts.toInstant().atOffset(ZoneOffset.UTC);
            } else if (row[4] instanceof OffsetDateTime odt) {
                createdAt = odt;
            }

            RecentMatchedAlert alert = new RecentMatchedAlert(catchAlertId, createdAt);
            alert.setSpeciesName(JsonNullable.of(row[2] instanceof String s2 ? s2 : null));
            alert.setFishermanName(JsonNullable.of(row[3] instanceof String s3 ? s3 : null));
            return alert;
        }).toList();

        // Unread notification count
        long unreadCount = notificationService.getUnreadCount(vendorId);

        VendorHomeSummary summary = new VendorHomeSummary(todayRevenue, buckets, unreadCount);
        summary.setLowStockSpecies(JsonNullable.of(lowStock));
        summary.setRecentMatchedAlerts(JsonNullable.of(recentAlerts));

        return ResponseEntity.ok(summary);
    }
}

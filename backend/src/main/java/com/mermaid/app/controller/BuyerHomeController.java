package com.mermaid.app.controller;

import com.mermaid.app.model.BuyerHomeSummary;
import com.mermaid.app.model.BuyerOrderStats;
import com.mermaid.app.model.Order;
import com.mermaid.app.model.StorefrontListingSummary;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.BuyerActivityService;
import com.mermaid.app.service.BuyerOrderService;
import com.mermaid.app.service.MarketplaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/buyer/home")
@PreAuthorize("hasRole('BUYER')")
public class BuyerHomeController {

    private final BuyerOrderService orderService;
    private final MarketplaceService marketplaceService;
    private final BuyerActivityService activityService;

    public BuyerHomeController(BuyerOrderService orderService,
                               MarketplaceService marketplaceService,
                               BuyerActivityService activityService) {
        this.orderService        = orderService;
        this.marketplaceService  = marketplaceService;
        this.activityService     = activityService;
    }

    @GetMapping
    public ResponseEntity<BuyerHomeSummary> getHome() {
        Long buyerId = SecurityUtils.currentUserId();

        List<Order> allOrders  = orderService.getMyOrders(buyerId, null);
        List<Order> recent     = allOrders.stream().limit(5).toList();

        long pending   = allOrders.stream().filter(o -> "PENDING".equals(o.getStatus())).count();
        long confirmed = allOrders.stream().filter(o -> "CONFIRMED".equals(o.getStatus())).count();
        long recent30d = allOrders.size();

        BuyerOrderStats stats = new BuyerOrderStats();
        stats.setPending((int) pending);
        stats.setConfirmed((int) confirmed);
        stats.setRecent30d((int) recent30d);

        List<StorefrontListingSummary> fresh = marketplaceService
            .searchStorefrontListings(null, null, null, 0, 3)
            .getContent();

        var activity = activityService.getActivity(buyerId, 5);

        BuyerHomeSummary summary = new BuyerHomeSummary();
        summary.setStats(stats);
        summary.setRecentOrders(recent);
        summary.setFreshListings(fresh);
        summary.setActivity(activity);

        return ResponseEntity.ok(summary);
    }
}

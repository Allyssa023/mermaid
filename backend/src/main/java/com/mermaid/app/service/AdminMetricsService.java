package com.mermaid.app.service;

import com.mermaid.app.domain.StorefrontListingStatus;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class AdminMetricsService {

    private final UserRepository userRepo;
    private final TripRepository tripRepo;
    private final StorefrontListingRepository listingRepo;
    private final OrderRepository orderRepo;
    private final AdvisoryRepository advisoryRepo;

    public AdminMetricsService(UserRepository userRepo, TripRepository tripRepo,
                               StorefrontListingRepository listingRepo,
                               OrderRepository orderRepo, AdvisoryRepository advisoryRepo) {
        this.userRepo = userRepo;
        this.tripRepo = tripRepo;
        this.listingRepo = listingRepo;
        this.orderRepo = orderRepo;
        this.advisoryRepo = advisoryRepo;
    }

    @Transactional(readOnly = true)
    public AdminMetrics getMetrics() {
        AdminMetrics m = new AdminMetrics();
        m.setTotalUsers((int) userRepo.count());
        m.setFishermen((int) userRepo.countByRole(Role.FISHERMAN));
        m.setVendors((int) userRepo.countByRole(Role.VENDOR));
        m.setBuyers((int) userRepo.countByRole(Role.BUYER));
        m.setAdmins((int) userRepo.countByRole(Role.ADMIN));
        m.setNewThisWeek((int) userRepo.countCreatedAfter(OffsetDateTime.now().minusDays(7)));
        m.setActiveNow((int) userRepo.countLastLoginAfter(OffsetDateTime.now().minusHours(24)));
        m.setTotalTrips((int) tripRepo.count());
        m.setActiveTrips((int) tripRepo.countByStatus(TripStatus.ACTIVE));
        m.setTripsToday((int) tripRepo.countStartedToday());
        m.setTotalListings((int) listingRepo.count());
        m.setOpenListings((int) listingRepo.countByStatus(StorefrontListingStatus.PUBLISHED));
        m.setTotalOrders((int) orderRepo.count());
        m.setOrdersToday((int) orderRepo.countCreatedToday());
        m.setDisputedOrders((int) orderRepo.countByStatus("DISPUTED"));
        m.setActiveAdvisories((int) advisoryRepo.countActive());
        return m;
    }
}

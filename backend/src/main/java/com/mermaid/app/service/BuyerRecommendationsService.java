package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.User;
import com.mermaid.app.mapper.DemandListingMapper;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Phase 4.3 — buyer-personalized listing recommendations.
 * Strategy: rank species by the buyer's completed-order count, then return
 * currently-OPEN listings of those species, sorted by vendor avgRating desc.
 * Falls back to highest-rated open listings when the buyer has no history.
 */
@Service
public class BuyerRecommendationsService {

    private static final int DEFAULT_LIMIT = 8;

    private final OrderRepository orderRepo;
    private final DemandListingRepository listingRepo;
    private final UserRepository userRepo;
    private final DemandListingMapper mapper;

    public BuyerRecommendationsService(OrderRepository orderRepo,
                                        DemandListingRepository listingRepo,
                                        UserRepository userRepo,
                                        DemandListingMapper mapper) {
        this.orderRepo = orderRepo;
        this.listingRepo = listingRepo;
        this.userRepo = userRepo;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.DemandListing> getRecommendations(Long buyerId, int limit) {
        int cap = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, 30);

        List<Order> completed = orderRepo.findAllByParticipantAndStatus(buyerId, "COMPLETED").stream()
            .filter(o -> o.getBuyerId().equals(buyerId))
            .toList();

        List<Long> rankedSpeciesIds = completed.stream()
            .filter(o -> o.getSpecies() != null)
            .collect(Collectors.groupingBy(o -> o.getSpecies().getId(), Collectors.counting()))
            .entrySet().stream()
            .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
            .map(Map.Entry::getKey)
            .toList();

        List<DemandListing> candidates;
        if (rankedSpeciesIds.isEmpty()) {
            candidates = listingRepo.findOpenListings(
                DemandListingStatus.OPEN, null, null, null, null);
        } else {
            candidates = rankedSpeciesIds.stream()
                .flatMap(sid -> listingRepo.findOpenOffersBySpecies(
                    DemandListingStatus.OPEN, sid, null).stream())
                .distinct()
                .toList();
        }

        if (candidates.isEmpty()) return List.of();

        // Resolve vendor info for sorting + DTO mapping
        List<Long> vendorIds = candidates.stream().map(DemandListing::getVendorId).distinct().toList();
        Map<Long, User> vendors = userRepo.findAllById(vendorIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));

        return candidates.stream()
            .sorted(Comparator
                .comparing((DemandListing l) -> vendorRating(vendors.get(l.getVendorId())))
                .reversed()
                .thenComparing(DemandListing::getPostedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(cap)
            .map(l -> mapper.toModel(l,
                vendors.containsKey(l.getVendorId()) ? vendors.get(l.getVendorId()).getFullName() : null))
            .toList();
    }

    private static BigDecimal vendorRating(User u) {
        if (u == null || u.getAvgRating() == null) return BigDecimal.ZERO;
        return u.getAvgRating();
    }
}

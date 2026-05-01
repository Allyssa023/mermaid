package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.User;
import com.mermaid.app.mapper.DemandListingMapper;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.BuyerListingDetail;
import com.mermaid.app.model.BuyerListingSort;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.model.OfferLookupItem;
import com.mermaid.app.model.PagedDemandListings;
import org.openapitools.jackson.nullable.JsonNullable;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MarketplaceService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final double EARTH_RADIUS_KM = 6371.0088;

    private final DemandListingRepository listingRepo;
    private final DemandListingMapper mapper;
    private final UserRepository userRepo;

    public MarketplaceService(DemandListingRepository listingRepo,
                               DemandListingMapper mapper,
                               UserRepository userRepo) {
        this.listingRepo = listingRepo;
        this.mapper = mapper;
        this.userRepo = userRepo;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.DemandListing> browseListings(
            Long speciesId, Long locationId, Double minOfferPrice, Double maxOfferPrice) {

        BigDecimal minPrice = minOfferPrice != null ? BigDecimal.valueOf(minOfferPrice) : null;
        BigDecimal maxPrice = maxOfferPrice != null ? BigDecimal.valueOf(maxOfferPrice) : null;

        List<DemandListing> entities = listingRepo.findOpenListings(
                DemandListingStatus.OPEN, speciesId, locationId, minPrice, maxPrice);

        Map<Long, String> vendorNames = batchVendorNames(entities);
        return entities.stream()
                .map(e -> mapper.toModel(e, vendorNames.getOrDefault(e.getVendorId(), "Unknown Vendor")))
                .toList();
    }

    /**
     * Phase 1.1 — paginated, searchable, distance-aware browse for buyers.
     * When distance is involved (DISTANCE_ASC sort or maxDistanceKm), the query loads all
     * matches for the non-distance filters, then computes haversine in memory, filters,
     * sorts, and slices the page. Otherwise pagination + sort happen at DB level.
     */
    @Transactional(readOnly = true)
    public PagedDemandListings searchListings(BuyerMarketplaceFilter f) {
        BuyerListingSort sort = f.sort() != null ? f.sort() : BuyerListingSort.RECENT;
        int pageIdx = f.page() != null && f.page() >= 0 ? f.page() : 0;
        int size = f.size() != null && f.size() > 0
                ? Math.min(f.size(), MAX_PAGE_SIZE)
                : DEFAULT_PAGE_SIZE;

        boolean distanceMode = sort == BuyerListingSort.DISTANCE_ASC
                || f.maxDistanceKm() != null;
        if (distanceMode && (f.lat() == null || f.lng() == null)) {
            throw new IllegalArgumentException(
                    "lat and lng are required when sort=DISTANCE_ASC or maxDistanceKm is supplied");
        }

        BigDecimal minPrice = f.minOfferPrice() != null ? BigDecimal.valueOf(f.minOfferPrice()) : null;
        BigDecimal maxPrice = f.maxOfferPrice() != null ? BigDecimal.valueOf(f.maxOfferPrice()) : null;
        String qLike = normalizeQuery(f.q());

        if (distanceMode) {
            return distanceModeSearch(f, sort, pageIdx, size, minPrice, maxPrice, qLike);
        }
        return dbPagedSearch(f, sort, pageIdx, size, minPrice, maxPrice, qLike);
    }

    private PagedDemandListings dbPagedSearch(BuyerMarketplaceFilter f, BuyerListingSort sort,
                                               int pageIdx, int size,
                                               BigDecimal minPrice, BigDecimal maxPrice, String qLike) {
        Pageable pageable = PageRequest.of(pageIdx, size, sortFor(sort));
        Page<DemandListing> page = listingRepo.searchOpenListings(
                DemandListingStatus.OPEN, qLike,
                f.speciesId(), f.locationId(), minPrice, maxPrice, pageable);

        Map<Long, String> vendorNames = batchVendorNames(page.getContent());
        List<com.mermaid.app.model.DemandListing> mapped = page.getContent().stream()
                .map(e -> mapper.toModel(e, vendorNames.getOrDefault(e.getVendorId(), "Unknown Vendor")))
                .toList();

        return new PagedDemandListings(mapped, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }

    private PagedDemandListings distanceModeSearch(BuyerMarketplaceFilter f, BuyerListingSort sort,
                                                    int pageIdx, int size,
                                                    BigDecimal minPrice, BigDecimal maxPrice, String qLike) {
        // Load all matches for non-distance filters; distance filter+sort applied here.
        Pageable unbounded = PageRequest.of(0, Integer.MAX_VALUE, sortFor(BuyerListingSort.RECENT));
        Page<DemandListing> all = listingRepo.searchOpenListings(
                DemandListingStatus.OPEN, qLike,
                f.speciesId(), f.locationId(), minPrice, maxPrice, unbounded);

        double lat = f.lat();
        double lng = f.lng();
        Double maxKm = f.maxDistanceKm();

        record Scored(DemandListing entity, Double distance) {}

        List<Scored> scored = new ArrayList<>(all.getContent().size());
        for (DemandListing e : all.getContent()) {
            Double dist = haversineKm(lat, lng, e);
            if (maxKm != null && (dist == null || dist > maxKm)) continue;
            scored.add(new Scored(e, dist));
        }

        if (sort == BuyerListingSort.DISTANCE_ASC) {
            scored.sort(Comparator.comparing(s -> s.distance() == null ? Double.MAX_VALUE : s.distance()));
        } else if (sort == BuyerListingSort.PRICE_ASC) {
            scored.sort(Comparator.comparing(s -> s.entity().getOfferPricePerKg()));
        } else if (sort == BuyerListingSort.PRICE_DESC) {
            scored.sort(Comparator.<Scored, BigDecimal>comparing(s -> s.entity().getOfferPricePerKg()).reversed());
        }
        // RECENT: already in postedAt DESC from query

        int total = scored.size();
        int from = Math.min(pageIdx * size, total);
        int to = Math.min(from + size, total);
        List<Scored> slice = scored.subList(from, to);

        Map<Long, String> vendorNames = batchVendorNames(
                slice.stream().map(Scored::entity).toList());

        List<com.mermaid.app.model.DemandListing> mapped = slice.stream()
                .map(s -> {
                    var m = mapper.toModel(s.entity(),
                            vendorNames.getOrDefault(s.entity().getVendorId(), "Unknown Vendor"));
                    if (s.distance() != null) {
                        m.setDistanceKm(JsonNullable.of(s.distance()));
                    }
                    return m;
                })
                .toList();

        int totalPages = size == 0 ? 0 : (int) Math.ceil((double) total / size);
        return new PagedDemandListings(mapped, pageIdx, size, (long) total, totalPages);
    }

    private Sort sortFor(BuyerListingSort sort) {
        return switch (sort) {
            case PRICE_ASC -> Sort.by(Sort.Order.asc("offerPricePerKg"), Sort.Order.desc("id"));
            case PRICE_DESC -> Sort.by(Sort.Order.desc("offerPricePerKg"), Sort.Order.desc("id"));
            // DISTANCE_ASC reaches here only when defaulting; treat as RECENT for DB sort.
            case RECENT, DISTANCE_ASC -> Sort.by(Sort.Order.desc("postedAt"), Sort.Order.desc("id"));
        };
    }

    private static String normalizeQuery(String q) {
        if (q == null) return null;
        String trimmed = q.trim().toLowerCase();
        if (trimmed.isEmpty()) return null;
        return "%" + trimmed + "%";
    }

    private static Double haversineKm(double lat1, double lng1, DemandListing listing) {
        if (listing.getLocation() == null) return null;
        BigDecimal lat2bd = listing.getLocation().getLat();
        BigDecimal lng2bd = listing.getLocation().getLng();
        if (lat2bd == null || lng2bd == null) return null;
        double lat2 = lat2bd.doubleValue();
        double lng2 = lng2bd.doubleValue();

        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    /**
     * Phase 1.2 — single listing detail with vendor profile and 4 related listings.
     * Related = same vendor (preferred) OR same species, OPEN, exclude the current listing.
     */
    @Transactional(readOnly = true)
    public BuyerListingDetail getListingDetail(Long listingId) {
        DemandListing entity = listingRepo.findById(listingId)
                .filter(d -> !d.isDeleted() && d.getStatus() == DemandListingStatus.OPEN)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Listing not found: " + listingId));

        User vendor = userRepo.findById(entity.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vendor not found for listing: " + listingId));

        // Related listings — fetch a small page from same vendor first; if fewer than 4,
        // top up with same-species listings from other vendors. Exclude self.
        List<DemandListing> sameVendor = listingRepo
                .findAllByVendorIdAndStatusAndIsDeletedFalseOrderByPostedAtDescIdDesc(
                        entity.getVendorId(), DemandListingStatus.OPEN)
                .stream()
                .filter(d -> !d.getId().equals(entity.getId()))
                .limit(4)
                .toList();

        List<DemandListing> related = new ArrayList<>(sameVendor);
        if (related.size() < 4 && entity.getSpecies() != null) {
            int needed = 4 - related.size();
            List<DemandListing> sameSpecies = listingRepo.findOpenOffersBySpecies(
                    DemandListingStatus.OPEN, entity.getSpecies().getId(), null)
                    .stream()
                    .filter(d -> !d.getId().equals(entity.getId()))
                    .filter(d -> related.stream().noneMatch(r -> r.getId().equals(d.getId())))
                    .limit(needed)
                    .toList();
            related.addAll(sameSpecies);
        }

        Map<Long, String> vendorNames = batchVendorNames(related);

        com.mermaid.app.model.DemandListing listingModel = mapper.toModel(entity, vendor.getFullName());
        com.mermaid.app.model.BuyerVendorProfile vendorModel = mapper.toVendorProfile(vendor);
        List<com.mermaid.app.model.DemandListing> relatedModels = related.stream()
                .map(d -> mapper.toModel(d, vendorNames.getOrDefault(d.getVendorId(), "Unknown Vendor")))
                .toList();

        BuyerListingDetail detail = new BuyerListingDetail(
                listingModel, vendorModel, List.of(), relatedModels);
        detail.setDescription(JsonNullable.of(entity.getNotes()));
        return detail;
    }

    @Transactional(readOnly = true)
    public List<OfferLookupItem> lookupOffers(Long speciesId, Long locationId) {
        if (speciesId == null) throw new IllegalArgumentException("speciesId is required");

        List<DemandListing> entities = listingRepo.findOpenOffersBySpecies(
                DemandListingStatus.OPEN, speciesId, locationId);

        Map<Long, String> vendorNames = batchVendorNames(entities);
        return entities.stream()
                .map(e -> mapper.toOfferLookupItem(e, vendorNames.getOrDefault(e.getVendorId(), "Unknown Vendor")))
                .toList();
    }

    private Map<Long, String> batchVendorNames(List<DemandListing> entities) {
        List<Long> vendorIds = entities.stream()
                .map(DemandListing::getVendorId)
                .distinct()
                .toList();
        return userRepo.findAllById(vendorIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
    }

    /** Filter parameters for buyer marketplace browse. */
    public record BuyerMarketplaceFilter(
            String q,
            Long speciesId,
            Long locationId,
            Double minOfferPrice,
            Double maxOfferPrice,
            Double lat,
            Double lng,
            Double maxDistanceKm,
            BuyerListingSort sort,
            Integer page,
            Integer size
    ) {}
}

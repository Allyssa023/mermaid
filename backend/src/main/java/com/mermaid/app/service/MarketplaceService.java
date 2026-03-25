package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.User;
import com.mermaid.app.mapper.DemandListingMapper;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.model.OfferLookupItem;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MarketplaceService {

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
}

package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.ListingInterest;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.DuplicateInterestException;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.ListingInterestMapper;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.model.ListingInterestDetail;
import com.mermaid.app.model.VendorInterestItem;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.ListingInterestRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ListingInterestService {

    private final ListingInterestRepository interestRepo;
    private final DemandListingRepository listingRepo;
    private final UserRepository userRepo;
    private final ListingInterestMapper mapper;
    private final MessageService messageService;

    public ListingInterestService(ListingInterestRepository interestRepo,
                                   DemandListingRepository listingRepo,
                                   UserRepository userRepo,
                                   ListingInterestMapper mapper,
                                   MessageService messageService) {
        this.interestRepo = interestRepo;
        this.listingRepo  = listingRepo;
        this.userRepo     = userRepo;
        this.mapper       = mapper;
        this.messageService = messageService;
    }

    @Transactional
    public com.mermaid.app.model.ListingInterest express(Long listingId, Long fishermanId, String message) {
        DemandListing listing = listingRepo.findById(listingId)
            .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + listingId));

        if (listing.getStatus() != DemandListingStatus.OPEN) {
            throw new ListingClosedException(listingId);
        }

        if (interestRepo.existsByListing_IdAndFishermanId(listingId, fishermanId)) {
            throw new DuplicateInterestException(listingId);
        }

        String fishermanName = userRepo.findById(fishermanId)
            .map(User::getFullName).orElse("Unknown");

        ListingInterest interest = new ListingInterest();
        interest.setListing(listing);
        interest.setFishermanId(fishermanId);
        interest.setMessage(message);
        ListingInterest saved = interestRepo.save(interest);
        String fullMessage = String.format("Interested in %s at %s.\nNote: %s",
                listing.getSpecies().getCommonName(),
                listing.getLocation().getName(),
                message != null && !message.isBlank() ? message : "(No additional note)");

        try {
            messageService.saveMessage(fishermanId, listing.getVendorId(), fullMessage);
        } catch (Exception e) {
            // Failsafe so interest still succeeds even if routing fails
        }

        return mapper.toModel(saved, fishermanName);
    }

    @Transactional(readOnly = true)
    public List<VendorInterestItem> getInterestsForVendor(Long vendorId) {
        List<ListingInterest> interests =
            interestRepo.findByListing_VendorIdOrderByCreatedAtDesc(vendorId);

        List<Long> fishermanIds = interests.stream()
            .map(ListingInterest::getFishermanId)
            .distinct().toList();

        Map<Long, String> fishermanNames = userRepo.findAllById(fishermanIds).stream()
            .collect(Collectors.toMap(User::getId, User::getFullName));

        return interests.stream()
            .map(i -> mapper.toVendorItem(i,
                fishermanNames.getOrDefault(i.getFishermanId(), "Unknown Fisherman")))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ListingInterestDetail> myInterests(Long fishermanId) {
        List<ListingInterest> interests =
            interestRepo.findByFishermanIdOrderByCreatedAtDesc(fishermanId);

        List<Long> vendorIds = interests.stream()
            .map(i -> i.getListing().getVendorId())
            .distinct().toList();

        Map<Long, String> vendorNames = userRepo.findAllById(vendorIds).stream()
            .collect(Collectors.toMap(User::getId, User::getFullName));

        return interests.stream()
            .map(i -> mapper.toDetailModel(i,
                vendorNames.getOrDefault(i.getListing().getVendorId(), "Unknown Vendor")))
            .toList();
    }
}

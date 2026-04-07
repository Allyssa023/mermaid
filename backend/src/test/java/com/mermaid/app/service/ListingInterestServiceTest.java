package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.ListingInterest;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.DuplicateInterestException;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.ListingInterestMapper;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.ListingInterestRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ListingInterestServiceTest {

    @Mock ListingInterestRepository interestRepo;
    @Mock DemandListingRepository listingRepo;
    @Mock UserRepository userRepo;
    @Mock ListingInterestMapper mapper;
    @InjectMocks ListingInterestService service;

    @Test
    void express_listingNotFound_throwsResourceNotFound() {
        when(listingRepo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
            () -> service.express(99L, 1L, "I can bring fish"));
    }

    @Test
    void express_listingClosed_throwsListingClosed() {
        DemandListing closed = listing(1L, DemandListingStatus.CLOSED);
        when(listingRepo.findById(1L)).thenReturn(Optional.of(closed));
        assertThrows(ListingClosedException.class,
            () -> service.express(1L, 1L, "I can bring fish"));
    }

    @Test
    void express_duplicate_throwsDuplicateInterest() {
        DemandListing open = listing(1L, DemandListingStatus.OPEN);
        when(listingRepo.findById(1L)).thenReturn(Optional.of(open));
        when(interestRepo.existsByListing_IdAndFishermanId(1L, 5L)).thenReturn(true);
        assertThrows(DuplicateInterestException.class,
            () -> service.express(1L, 5L, "I can bring fish"));
    }

    @Test
    void express_success_savesAndReturnsModel() {
        DemandListing open = listing(1L, DemandListingStatus.OPEN);
        User fisherman = user(5L, "Isidro Cruz");
        ListingInterest saved = new ListingInterest();

        when(listingRepo.findById(1L)).thenReturn(Optional.of(open));
        when(interestRepo.existsByListing_IdAndFishermanId(1L, 5L)).thenReturn(false);
        when(userRepo.findById(5L)).thenReturn(Optional.of(fisherman));
        when(interestRepo.save(any())).thenReturn(saved);

        service.express(1L, 5L, "I can bring 40kg tomorrow");

        verify(interestRepo).save(any(ListingInterest.class));
        verify(mapper).toModel(eq(saved), eq("Isidro Cruz"));
    }

    @Test
    void myInterests_returnsAllForFisherman() {
        ListingInterest i = interestWithListing(1L, 5L, 10L);
        when(interestRepo.findByFishermanIdOrderByCreatedAtDesc(5L)).thenReturn(List.of(i));
        when(userRepo.findAllById(any())).thenReturn(List.of(user(10L, "Rosario")));

        service.myInterests(5L);

        verify(mapper).toDetailModel(eq(i), eq("Rosario"));
    }

    // --- helpers ---

    private DemandListing listing(Long id, DemandListingStatus status) {
        DemandListing l = new DemandListing();
        l.setId(id);
        l.setVendorId(10L);
        l.setStatus(status);
        return l;
    }

    private User user(Long id, String name) {
        User u = new User();
        u.setId(id);
        u.setFullName(name);
        return u;
    }

    private ListingInterest interestWithListing(Long id, Long fishermanId, Long vendorId) {
        DemandListing l = new DemandListing();
        l.setId(1L);
        l.setVendorId(vendorId);
        ListingInterest i = new ListingInterest();
        i.setId(id);
        i.setFishermanId(fishermanId);
        i.setListing(l);
        i.setMessage("test");
        return i;
    }
}

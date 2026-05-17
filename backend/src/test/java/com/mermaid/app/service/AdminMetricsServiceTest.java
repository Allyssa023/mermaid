package com.mermaid.app.service;

import com.mermaid.app.domain.StorefrontListingStatus;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminMetricsServiceTest {

    @Mock UserRepository userRepo;
    @Mock TripRepository tripRepo;
    @Mock StorefrontListingRepository listingRepo;
    @Mock OrderRepository orderRepo;
    @Mock AdvisoryRepository advisoryRepo;
    @InjectMocks AdminMetricsService service;

    @Test
    void getMetrics_aggregatesAllSources() {
        when(userRepo.count()).thenReturn(100L);
        when(userRepo.countByRole(Role.FISHERMAN)).thenReturn(60L);
        when(userRepo.countByRole(Role.VENDOR)).thenReturn(25L);
        when(userRepo.countByRole(Role.BUYER)).thenReturn(13L);
        when(userRepo.countByRole(Role.ADMIN)).thenReturn(2L);
        when(userRepo.countCreatedAfter(any())).thenReturn(5L);
        when(userRepo.countLastLoginAfter(any())).thenReturn(8L);
        when(tripRepo.count()).thenReturn(500L);
        when(tripRepo.countByStatus(TripStatus.ACTIVE)).thenReturn(10L);
        when(tripRepo.countStartedToday()).thenReturn(12L);
        when(listingRepo.count()).thenReturn(80L);
        when(listingRepo.countByStatus(StorefrontListingStatus.PUBLISHED)).thenReturn(40L);
        when(orderRepo.count()).thenReturn(300L);
        when(orderRepo.countCreatedToday()).thenReturn(15L);
        when(orderRepo.countByStatus("DISPUTED")).thenReturn(3L);
        when(advisoryRepo.countActive()).thenReturn(4L);

        AdminMetrics m = service.getMetrics();

        assertThat(m.getTotalUsers()).isEqualTo(100);
        assertThat(m.getFishermen()).isEqualTo(60);
        assertThat(m.getActiveNow()).isEqualTo(8);
        assertThat(m.getActiveAdvisories()).isEqualTo(4);
        assertThat(m.getDisputedOrders()).isEqualTo(3);
    }
}

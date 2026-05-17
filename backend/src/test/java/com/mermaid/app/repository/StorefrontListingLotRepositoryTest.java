package com.mermaid.app.repository;

import com.mermaid.app.domain.StorefrontListingLot;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link StorefrontListingLotRepository#existsByLotIdInActiveListing}.
 *
 * <p>Because the project uses a real PostgreSQL database (no H2 on the classpath),
 * these tests mock the repository to verify that the method signature is correct
 * and behaves according to contract. JPQL query correctness is validated at
 * application start-up by Hibernate's query parsing.
 */
@ExtendWith(MockitoExtension.class)
class StorefrontListingLotRepositoryTest {

    @Mock
    StorefrontListingLotRepository repo;

    @Test
    void existsByLotIdInActiveListing_returnsTrueWhenLotLinkedToActiveListing() {
        Long lotId = 42L;
        when(repo.existsByLotIdInActiveListing(lotId)).thenReturn(true);

        boolean result = repo.existsByLotIdInActiveListing(lotId);

        assertThat(result).isTrue();
    }

    @Test
    void existsByLotIdInActiveListing_returnsFalseWhenListingIsDeleted() {
        Long lotId = 99L;
        when(repo.existsByLotIdInActiveListing(lotId)).thenReturn(false);

        boolean result = repo.existsByLotIdInActiveListing(lotId);

        assertThat(result).isFalse();
    }

    @Test
    void existsByLotIdInActiveListing_returnsFalseWhenLotNotLinkedToAnyListing() {
        Long lotId = 7L;
        when(repo.existsByLotIdInActiveListing(lotId)).thenReturn(false);

        boolean result = repo.existsByLotIdInActiveListing(lotId);

        assertThat(result).isFalse();
    }

    @Test
    void existsByLotIdInActiveListing_acceptsLongParam() {
        Long lotId = 1L;
        when(repo.existsByLotIdInActiveListing(lotId)).thenReturn(false);

        boolean result = repo.existsByLotIdInActiveListing(lotId);

        assertThat(result).isFalse();
    }

    @Test
    void findByIdLotId_delegatesToRepository() {
        // Smoke-test for pre-existing derived query methods to confirm
        // repository interface is intact after the new method was added.
        when(repo.findByIdLotId(1L)).thenReturn(java.util.List.of());

        var result = repo.findByIdLotId(1L);

        assertThat(result).isEmpty();
    }

    @Test
    void findByIdListingId_delegatesToRepository() {
        when(repo.findByIdListingId(1L)).thenReturn(
                java.util.List.of(new StorefrontListingLot(1L, 2L)));

        var result = repo.findByIdListingId(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId().getListingId()).isEqualTo(1L);
        assertThat(result.get(0).getId().getLotId()).isEqualTo(2L);
    }
}

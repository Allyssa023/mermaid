package com.mermaid.app.repository;

import com.mermaid.app.domain.DealProposal;
import com.mermaid.app.domain.ProposalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DealProposalRepository extends JpaRepository<DealProposal, Long> {

    Optional<DealProposal> findFirstByDealIdAndStatus(Long dealId, ProposalStatus status);

    List<DealProposal> findByDealIdOrderByCreatedAtAsc(Long dealId);
}

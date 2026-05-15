package com.mermaid.app.mapper;

import com.mermaid.app.domain.Deal;
import com.mermaid.app.domain.DealProposal;
import com.mermaid.app.domain.Message;
import com.mermaid.app.model.ChatMessage;
import com.mermaid.app.model.DealDto;
import com.mermaid.app.model.DealProposalDto;
import com.mermaid.app.model.DealSummary;
import com.mermaid.app.model.FishSpecies;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DealMapper {

    private final FishSpeciesMapper fishSpeciesMapper;

    public DealMapper(FishSpeciesMapper fishSpeciesMapper) {
        this.fishSpeciesMapper = fishSpeciesMapper;
    }

    public DealProposalDto toProposalDto(DealProposal p) {
        DealProposalDto dto = new DealProposalDto(
                p.getId(),
                p.getDeal().getId(),
                p.getProposedById(),
                toDouble(p.getQtyKg()),
                toDouble(p.getPricePerKg()),
                com.mermaid.app.model.ProposalStatus.fromValue(p.getStatus().name()),
                p.getCreatedAt()
        );
        dto.setSupersededReason(nullable(p.getSupersededReason()));
        dto.setRespondedById(nullable(p.getRespondedById()));
        dto.setRespondedAt(nullable(p.getRespondedAt()));
        return dto;
    }

    public DealDto toDto(Deal deal, String vendorName, String fishermanName, DealProposal latestProposal) {
        DealDto dto = new DealDto(
                deal.getId(),
                deal.getCatchAlert().getId(),
                deal.getVendorId(),
                deal.getFishermanId(),
                com.mermaid.app.model.DealStatus.fromValue(deal.getStatus().name()),
                deal.getExpiresAt(),
                deal.getCreatedAt()
        );
        dto.setVendorName(nullable(vendorName));
        dto.setFishermanName(nullable(fishermanName));
        if (deal.getCatchAlert().getSpecies() != null) {
            FishSpecies species = fishSpeciesMapper.toModel(deal.getCatchAlert().getSpecies());
            dto.setSpecies(JsonNullable.of(species));
        }
        dto.setAgreedQtyKg(nullable(toDouble(deal.getAgreedQtyKg())));
        dto.setAgreedPricePerKg(nullable(toDouble(deal.getAgreedPricePerKg())));
        dto.setAgreedAt(nullable(deal.getAgreedAt()));
        dto.setOrderId(nullable(deal.getOrderId()));
        dto.setFishermanEngagedAt(nullable(deal.getFishermanEngagedAt()));
        dto.setClosedAt(nullable(deal.getClosedAt()));
        if (latestProposal != null) {
            dto.setLatestProposal(JsonNullable.of(toProposalDto(latestProposal)));
        }
        return dto;
    }

    public DealSummary toSummary(Deal deal, Long viewerId, String counterpartyName,
                                  DealProposal latestProposal, Integer competitorCount) {
        DealSummary s = new DealSummary(
                deal.getId(),
                deal.getCatchAlert().getId(),
                com.mermaid.app.model.DealStatus.fromValue(deal.getStatus().name()),
                deal.getCreatedAt()
        );
        if (deal.getCatchAlert().getSpecies() != null) {
            s.setSpeciesName(JsonNullable.of(deal.getCatchAlert().getSpecies().getCommonName()));
        }
        Long counterpartyId = deal.getVendorId().equals(viewerId)
                ? deal.getFishermanId()
                : deal.getVendorId();
        s.setCounterpartyId(JsonNullable.of(counterpartyId));
        s.setCounterpartyName(nullable(counterpartyName));
        if (latestProposal != null) {
            s.setLatestProposal(JsonNullable.of(toProposalDto(latestProposal)));
        }
        s.setCompetitorCount(nullable(competitorCount));
        s.setExpiresAt(JsonNullable.of(deal.getExpiresAt()));
        return s;
    }

    public ChatMessage toChatMessage(Message m) {
        ChatMessage c = new ChatMessage();
        c.setId(m.getId());
        c.setSenderId(m.getSender().getId());
        c.setRecipientId(m.getRecipient().getId());
        c.setContent(m.getContent());
        c.setSentAt(m.getSentAt());
        c.setRead(m.isRead());
        if (m.getDeal() != null) {
            c.setDealId(JsonNullable.of(m.getDeal().getId()));
        }
        return c;
    }

    private static Double toDouble(BigDecimal v) {
        return v == null ? null : v.doubleValue();
    }

    /** Emit {@code undefined} when the value is null so the field is omitted from JSON. */
    private static <T> JsonNullable<T> nullable(T v) {
        return v == null ? JsonNullable.undefined() : JsonNullable.of(v);
    }
}

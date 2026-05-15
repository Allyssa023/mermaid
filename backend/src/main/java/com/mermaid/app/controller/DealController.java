package com.mermaid.app.controller;

import com.mermaid.app.api.DealsApi;
import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.domain.Deal;
import com.mermaid.app.domain.DealProposal;
import com.mermaid.app.domain.DealStatus;
import com.mermaid.app.domain.Message;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.DealMapper;
import com.mermaid.app.mapper.OrderMapper;
import com.mermaid.app.repository.CatchAlertRepository;
import com.mermaid.app.model.AcceptProposalResponse;
import com.mermaid.app.model.CancelDealRequest;
import com.mermaid.app.model.CompetitorCountDto;
import com.mermaid.app.model.CreateProposalRequest;
import com.mermaid.app.model.DealDto;
import com.mermaid.app.model.DealMessagesPage;
import com.mermaid.app.model.DealProposalDto;
import com.mermaid.app.model.DealSummary;
import com.mermaid.app.model.EngageDealResponse;
import com.mermaid.app.model.RejectProposalRequest;
import com.mermaid.app.repository.DealProposalRepository;
import com.mermaid.app.repository.DealRepository;
import com.mermaid.app.repository.MessageRepository;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.DealService;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@PreAuthorize("hasAnyRole('VENDOR','FISHERMAN')")
public class DealController implements DealsApi {

    private final DealService dealService;
    private final DealRepository dealRepo;
    private final DealProposalRepository proposalRepo;
    private final MessageRepository messageRepo;
    private final UserRepository userRepo;
    private final CatchAlertRepository alertRepo;
    private final DealMapper dealMapper;
    private final OrderMapper orderMapper;

    public DealController(DealService dealService,
                          DealRepository dealRepo,
                          DealProposalRepository proposalRepo,
                          MessageRepository messageRepo,
                          UserRepository userRepo,
                          CatchAlertRepository alertRepo,
                          DealMapper dealMapper,
                          OrderMapper orderMapper) {
        this.dealService = dealService;
        this.dealRepo = dealRepo;
        this.proposalRepo = proposalRepo;
        this.messageRepo = messageRepo;
        this.userRepo = userRepo;
        this.alertRepo = alertRepo;
        this.dealMapper = dealMapper;
        this.orderMapper = orderMapper;
    }

    // ── reads ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public ResponseEntity<DealDto> getDeal(Long id) {
        Long me = SecurityUtils.currentUserId();
        Deal deal = loadAsParticipant(id, me);
        DealProposal latest = latestProposal(id);
        return ResponseEntity.ok(dealMapper.toDto(deal,
                nameOf(deal.getVendorId()), nameOf(deal.getFishermanId()), latest));
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseEntity<List<DealSummary>> listMyDeals(com.mermaid.app.model.DealStatus status) {
        Long me = SecurityUtils.currentUserId();
        DealStatus s = status != null ? DealStatus.valueOf(status.name()) : null;
        List<Deal> asVendor = s != null
                ? dealRepo.findByVendorIdAndStatus(me, s)
                : dealRepo.findByVendorId(me);
        List<Deal> asFisherman = s != null
                ? dealRepo.findByFishermanIdAndStatus(me, s)
                : dealRepo.findByFishermanId(me);

        Map<Long, Deal> merged = new HashMap<>();
        for (Deal d : asVendor) merged.put(d.getId(), d);
        for (Deal d : asFisherman) merged.put(d.getId(), d);

        return ResponseEntity.ok(merged.values().stream()
                .map(d -> {
                    Long counterpartyId = d.getVendorId().equals(me) ? d.getFishermanId() : d.getVendorId();
                    return dealMapper.toSummary(d, me, nameOf(counterpartyId),
                            latestProposal(d.getId()),
                            competitorCountFor(d, me));
                })
                .collect(Collectors.toList()));
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseEntity<List<DealSummary>> listFishermanAlertDeals(Long alertId) {
        Long me = SecurityUtils.currentUserId();
        CatchAlert alert = alertRepo.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert " + alertId));
        if (!alert.getFishermanId().equals(me)) {
            throw new AccessDeniedException("Only the alert owner can view its deals");
        }
        List<Deal> deals = dealRepo.findByCatchAlertIdAndStatus(alertId, DealStatus.NEGOTIATING);
        return ResponseEntity.ok(deals.stream()
                .map(d -> dealMapper.toSummary(d, me, nameOf(d.getVendorId()),
                        latestProposal(d.getId()), null))
                .collect(Collectors.toList()));
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseEntity<CompetitorCountDto> getDealCompetitorCount(Long id) {
        Long me = SecurityUtils.currentUserId();
        Deal deal = loadAsParticipant(id, me);
        if (!deal.getVendorId().equals(me)) {
            throw new AccessDeniedException("Only the deal vendor can view competitor count");
        }
        int count = dealRepo.countOpenDealsOnAlertExcludingVendor(
                deal.getCatchAlert().getId(), deal.getVendorId());
        CompetitorCountDto dto = new CompetitorCountDto(deal.getCatchAlert().getId(), count);
        return ResponseEntity.ok(dto);
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseEntity<DealMessagesPage> listDealMessages(Long id, Integer page, Integer size) {
        Long me = SecurityUtils.currentUserId();
        loadAsParticipant(id, me);
        int p = page != null ? page : 0;
        int sz = size != null ? size : 50;
        Pageable pageable = PageRequest.of(p, sz, Sort.by(Sort.Direction.ASC, "sentAt").and(Sort.by(Sort.Direction.ASC, "id")));
        Page<Message> messages = messageRepo.findByDealId(id, pageable);

        DealMessagesPage out = new DealMessagesPage(
                messages.getContent().stream().map(dealMapper::toChatMessage).collect(Collectors.toList()),
                messages.getNumber(),
                messages.getSize(),
                messages.getTotalElements(),
                messages.getTotalPages()
        );
        return ResponseEntity.ok(out);
    }

    // ── writes ────────────────────────────────────────────────────────────

    @Override
    public ResponseEntity<DealProposalDto> createDealProposal(Long id, CreateProposalRequest req) {
        Long me = SecurityUtils.currentUserId();
        DealProposal p = dealService.submitProposal(me, id,
                BigDecimal.valueOf(req.getQtyKg()),
                BigDecimal.valueOf(req.getPricePerKg()));
        return ResponseEntity.ok(dealMapper.toProposalDto(p));
    }

    @Override
    public ResponseEntity<DealProposalDto> rejectDealProposal(Long id, Long proposalId, RejectProposalRequest req) {
        Long me = SecurityUtils.currentUserId();
        DealProposal p = dealService.rejectProposal(me, id, proposalId, unwrap(req != null ? req.getReason() : null));
        return ResponseEntity.ok(dealMapper.toProposalDto(p));
    }

    @Override
    public ResponseEntity<AcceptProposalResponse> acceptDealProposal(Long id, Long proposalId) {
        Long me = SecurityUtils.currentUserId();
        DealService.AcceptResult result = dealService.acceptProposal(me, id, proposalId);
        Deal deal = result.deal();
        Order order = result.order();
        AcceptProposalResponse resp = new AcceptProposalResponse();
        resp.setDeal(dealMapper.toDto(deal,
                nameOf(deal.getVendorId()), nameOf(deal.getFishermanId()),
                latestProposal(deal.getId())));
        resp.setOrder(orderMapper.toModel(order,
                nameOf(order.getBuyerId()), nameOf(order.getSellerId()),
                null, null));
        return ResponseEntity.ok(resp);
    }

    @Override
    public ResponseEntity<DealDto> cancelDeal(Long id, CancelDealRequest req) {
        Long me = SecurityUtils.currentUserId();
        Deal deal = dealService.cancelDeal(me, id, unwrap(req != null ? req.getReason() : null));
        return ResponseEntity.ok(dealMapper.toDto(deal,
                nameOf(deal.getVendorId()), nameOf(deal.getFishermanId()),
                latestProposal(deal.getId())));
    }

    @Override
    public ResponseEntity<DealDto> rejectDeal(Long id, RejectProposalRequest req) {
        Long me = SecurityUtils.currentUserId();
        Deal deal = dealService.rejectDeal(me, id, unwrap(req != null ? req.getReason() : null));
        return ResponseEntity.ok(dealMapper.toDto(deal,
                nameOf(deal.getVendorId()), nameOf(deal.getFishermanId()),
                latestProposal(deal.getId())));
    }

    @Override
    public ResponseEntity<EngageDealResponse> engageDeal(Long id) {
        Long me = SecurityUtils.currentUserId();
        Deal deal = dealService.engageDeal(me, id);
        EngageDealResponse resp = new EngageDealResponse(deal.getId(), deal.getFishermanEngagedAt());
        return ResponseEntity.ok(resp);
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private Deal loadAsParticipant(Long dealId, Long userId) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal " + dealId));
        if (!deal.getVendorId().equals(userId) && !deal.getFishermanId().equals(userId)) {
            throw new AccessDeniedException("Not a participant of deal " + dealId);
        }
        return deal;
    }

    private DealProposal latestProposal(Long dealId) {
        return proposalRepo.findFirstByDealIdOrderByCreatedAtDesc(dealId).orElse(null);
    }

    private Integer competitorCountFor(Deal deal, Long viewerId) {
        if (!deal.getVendorId().equals(viewerId)) return null;
        return dealRepo.countOpenDealsOnAlertExcludingVendor(
                deal.getCatchAlert().getId(), deal.getVendorId());
    }

    private String nameOf(Long userId) {
        if (userId == null) return null;
        return userRepo.findById(userId).map(User::getFullName).orElse(null);
    }

    private static String unwrap(JsonNullable<String> v) {
        if (v == null || !v.isPresent()) return null;
        return v.get();
    }
}

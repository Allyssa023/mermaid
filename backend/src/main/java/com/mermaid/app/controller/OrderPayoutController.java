package com.mermaid.app.controller;

import com.mermaid.app.api.PayoutsApi;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.domain.Payment;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.OrderPayoutRequest;
import com.mermaid.app.model.OrderPayoutResponse;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.PaymentGatewayService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@PreAuthorize("hasAnyRole('VENDOR','FISHERMAN')")
public class OrderPayoutController implements PayoutsApi {

    private final OrderRepository orderRepo;
    private final PaymentRepository paymentRepo;
    private final UserRepository userRepo;
    private final PaymentGatewayService gatewayService;

    public OrderPayoutController(OrderRepository orderRepo, PaymentRepository paymentRepo,
                                  UserRepository userRepo, PaymentGatewayService gatewayService) {
        this.orderRepo      = orderRepo;
        this.paymentRepo    = paymentRepo;
        this.userRepo       = userRepo;
        this.gatewayService = gatewayService;
    }

    @Override
    public ResponseEntity<OrderPayoutResponse> initiateOrderPayout(Long orderId,
                                                                    OrderPayoutRequest orderPayoutRequest) {
        Long initiatorId = SecurityUtils.currentUserId();

        com.mermaid.app.domain.Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!order.getBuyerId().equals(initiatorId) && !order.getSellerId().equals(initiatorId)) {
            throw new ResourceNotFoundException("Order not found: " + orderId);
        }
        if (paymentRepo.findByOrderId(orderId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payout already initiated");
        }
        if (order.getKind() != OrderKind.PROCUREMENT) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Payouts only available for procurement orders");
        }

        User fisherman = userRepo.findById(order.getSellerId())
            .orElseThrow(() -> new ResourceNotFoundException("Fisherman not found"));

        String channelCode = orderPayoutRequest.getChannelCode().getValue();
        String phone = "PH_GCASH".equals(channelCode)
            ? fisherman.getGcashNumber()
            : fisherman.getMayaNumber();

        if (phone == null || phone.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Fisherman has no e-wallet number on file for " + channelCode);
        }

        BigDecimal qty = order.getOrderedQtyKg() != null ? order.getOrderedQtyKg() : BigDecimal.ONE;
        long amountCentavos = order.getAgreedPricePerKg().multiply(qty)
            .multiply(BigDecimal.valueOf(100)).longValue();

        String idempotencyKey = UUID.randomUUID().toString();
        PaymentGatewayService.DisbursementResult result = gatewayService.disburse(
            phone, channelCode, amountCentavos,
            "Order #" + orderId + " fisherman payment", idempotencyKey);

        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setPayerId(initiatorId);
        payment.setPayeeId(order.getSellerId());
        payment.setAmount(order.getAgreedPricePerKg().multiply(qty));
        payment.setMethod(channelCode);
        payment.setPayoutId(result.payoutId());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setGateway(gatewayService.getGatewayName());
        payment.setStatus("SUCCEEDED".equals(result.status()) ? "CONFIRMED" : "PENDING");
        paymentRepo.save(payment);

        OrderPayoutResponse response = new OrderPayoutResponse();
        response.setPayoutId(result.payoutId());
        response.setStatus(result.status());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}

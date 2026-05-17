package com.mermaid.app.service;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderStatusEvent;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.OrderStatusEventRepository;
import com.mermaid.app.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Component
public class RetailOrderAutoCompleter {

    private static final Logger log = LoggerFactory.getLogger(RetailOrderAutoCompleter.class);

    private final OrderRepository orderRepo;
    private final PaymentRepository paymentRepo;
    private final OrderStatusEventRepository eventRepo;

    public RetailOrderAutoCompleter(OrderRepository orderRepo,
                                    PaymentRepository paymentRepo,
                                    OrderStatusEventRepository eventRepo) {
        this.orderRepo = orderRepo;
        this.paymentRepo = paymentRepo;
        this.eventRepo = eventRepo;
    }

    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void autoCompleteStaleReceipts() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusHours(48);
        List<Order> stale = orderRepo.findByStatusAndUpdatedAtBefore("AWAITING_RECEIPT", cutoff);
        for (Order order : stale) {
            try {
                paymentRepo.findByOrderId(order.getId()).ifPresent(payment -> {
                    if ("COD".equals(payment.getMethod()) && "PENDING".equals(payment.getStatus())) {
                        payment.setStatus("CONFIRMED");
                        payment.setPaidAt(OffsetDateTime.now());
                        paymentRepo.save(payment);
                    }
                });
                order.setStatus("COMPLETED");
                order.setCompletedAt(OffsetDateTime.now());
                orderRepo.save(order);

                OrderStatusEvent event = new OrderStatusEvent();
                event.setOrderId(order.getId());
                event.setStatus("COMPLETED");
                event.setNote("Auto-completed after 48 hours — buyer did not confirm receipt");
                eventRepo.save(event);

                log.info("Auto-completed order {} after 48h receipt timeout", order.getId());
            } catch (Exception e) {
                log.warn("Auto-complete failed for order {}: {}", order.getId(), e.getMessage());
            }
        }
    }
}

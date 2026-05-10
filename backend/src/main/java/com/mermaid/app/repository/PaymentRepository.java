package com.mermaid.app.repository;

import com.mermaid.app.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByOrderId(Long orderId);
    Optional<Payment> findByPaymentIntentId(String paymentIntentId);
    Optional<Payment> findByPayoutId(String payoutId);
}

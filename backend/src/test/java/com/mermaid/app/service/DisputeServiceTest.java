package com.mermaid.app.service;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderDispute;
import com.mermaid.app.model.OrderDisputeRequest;
import com.mermaid.app.repository.OrderDisputeRepository;
import com.mermaid.app.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DisputeServiceTest {

    @Mock OrderDisputeRepository disputeRepo;
    @Mock OrderRepository orderRepo;
    @Mock InventoryService inventoryService;
    @InjectMocks DisputeService service;

    private Order order(String status) {
        Order o = new Order();
        o.setId(1L);
        o.setStatus(status);
        o.setSellerId(10L);
        o.setBuyerId(20L);
        return o;
    }

    @Test
    void raise_sets_order_to_DISPUTED_and_captures_preDisputeStatus() {
        Order o = order("READY");
        when(orderRepo.findById(1L)).thenReturn(Optional.of(o));
        when(disputeRepo.existsByOrderIdAndStatus(1L, "OPEN")).thenReturn(false);
        when(disputeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        OrderDispute d = service.raise(10L, "FISHERMAN", 1L, new OrderDisputeRequest());

        assertThat(d.getRaisedBy()).isEqualTo("FISHERMAN");
        assertThat(d.getPreDisputeStatus()).isEqualTo("READY");
        assertThat(o.getStatus()).isEqualTo("DISPUTED");
    }

    @Test
    void raise_throws_400_when_order_not_in_READY_or_COMPLETED() {
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order("PENDING")));

        assertThatThrownBy(() -> service.raise(10L, "FISHERMAN", 1L, new OrderDisputeRequest()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void raise_throws_409_when_open_dispute_already_exists() {
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order("READY")));
        when(disputeRepo.existsByOrderIdAndStatus(1L, "OPEN")).thenReturn(true);

        assertThatThrownBy(() -> service.raise(10L, "FISHERMAN", 1L, new OrderDisputeRequest()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void resolve_by_raising_party_throws_AccessDeniedException() {
        OrderDispute dispute = new OrderDispute();
        dispute.setOrderId(1L);
        dispute.setRaisedBy("FISHERMAN");
        when(disputeRepo.findByOrderIdAndStatus(1L, "OPEN")).thenReturn(Optional.of(dispute));

        assertThatThrownBy(() -> service.resolve(10L, "FISHERMAN", 1L, "resolution"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void resolve_from_READY_calls_addLotFromProcurement() {
        OrderDispute dispute = new OrderDispute();
        dispute.setOrderId(1L);
        dispute.setRaisedBy("VENDOR");
        dispute.setPreDisputeStatus("READY");
        when(disputeRepo.findByOrderIdAndStatus(1L, "OPEN")).thenReturn(Optional.of(dispute));
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order("DISPUTED")));
        when(disputeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.resolve(10L, "FISHERMAN", 1L, "resolution text");

        verify(inventoryService).addLotFromProcurement(1L);
    }

    @Test
    void resolve_from_COMPLETED_does_NOT_call_addLotFromProcurement() {
        OrderDispute dispute = new OrderDispute();
        dispute.setOrderId(1L);
        dispute.setRaisedBy("VENDOR");
        dispute.setPreDisputeStatus("COMPLETED");
        when(disputeRepo.findByOrderIdAndStatus(1L, "OPEN")).thenReturn(Optional.of(dispute));
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order("DISPUTED")));
        when(disputeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.resolve(10L, "FISHERMAN", 1L, "resolution text");

        verify(inventoryService, never()).addLotFromProcurement(any());
    }
}

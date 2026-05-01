package com.mermaid.app.service;

import com.mermaid.app.domain.BuyerAddress;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.BuyerAddressMapper;
import com.mermaid.app.model.BuyerAddressCreateRequest;
import com.mermaid.app.model.BuyerAddressUpdateRequest;
import com.mermaid.app.repository.BuyerAddressRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BuyerAddressService {

    private final BuyerAddressRepository repo;
    private final BuyerAddressMapper mapper;

    public BuyerAddressService(BuyerAddressRepository repo, BuyerAddressMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.BuyerAddress> list(Long buyerId) {
        return repo.findByBuyerIdAndActiveTrueOrderByIsDefaultDescIdAsc(buyerId).stream()
                .map(mapper::toModel)
                .toList();
    }

    @Transactional(readOnly = true)
    public BuyerAddress requireOwned(Long buyerId, Long addressId) {
        return repo.findByIdAndBuyerIdAndActiveTrue(addressId, buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found: " + addressId));
    }

    @Transactional
    public com.mermaid.app.model.BuyerAddress create(Long buyerId, BuyerAddressCreateRequest req) {
        BuyerAddress entity = new BuyerAddress();
        entity.setBuyerId(buyerId);
        mapper.applyCreate(req, entity);

        boolean noneActive = repo.findByBuyerIdAndActiveTrueOrderByIsDefaultDescIdAsc(buyerId).isEmpty();
        boolean wantDefault = Boolean.TRUE.equals(req.getSetAsDefault()) || noneActive;
        if (wantDefault) {
            repo.demoteAllDefaults(buyerId);
            entity.setDefault(true);
        }
        return mapper.toModel(repo.save(entity));
    }

    @Transactional
    public com.mermaid.app.model.BuyerAddress update(Long buyerId, Long addressId, BuyerAddressUpdateRequest req) {
        BuyerAddress entity = requireOwned(buyerId, addressId);
        mapper.applyUpdate(req, entity);
        return mapper.toModel(repo.save(entity));
    }

    @Transactional
    public void softDelete(Long buyerId, Long addressId) {
        BuyerAddress entity = requireOwned(buyerId, addressId);
        entity.setActive(false);
        entity.setDefault(false);
        repo.save(entity);
    }

    @Transactional
    public com.mermaid.app.model.BuyerAddress setDefault(Long buyerId, Long addressId) {
        BuyerAddress entity = requireOwned(buyerId, addressId);
        repo.demoteAllDefaults(buyerId);
        entity.setDefault(true);
        return mapper.toModel(repo.save(entity));
    }
}

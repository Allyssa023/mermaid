package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerAddressesApi;
import com.mermaid.app.model.BuyerAddress;
import com.mermaid.app.model.BuyerAddressCreateRequest;
import com.mermaid.app.model.BuyerAddressUpdateRequest;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.BuyerAddressService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('BUYER')")
public class BuyerAddressController implements BuyerAddressesApi {

    private final BuyerAddressService service;

    public BuyerAddressController(BuyerAddressService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<List<BuyerAddress>> getBuyerAddresses() {
        return ResponseEntity.ok(service.list(SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<BuyerAddress> createBuyerAddress(BuyerAddressCreateRequest request) {
        return ResponseEntity.status(201).body(service.create(SecurityUtils.currentUserId(), request));
    }

    @Override
    public ResponseEntity<BuyerAddress> updateBuyerAddress(Long addressId, BuyerAddressUpdateRequest request) {
        return ResponseEntity.ok(service.update(SecurityUtils.currentUserId(), addressId, request));
    }

    @Override
    public ResponseEntity<Void> deleteBuyerAddress(Long addressId) {
        service.softDelete(SecurityUtils.currentUserId(), addressId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<BuyerAddress> setBuyerAddressDefault(Long addressId) {
        return ResponseEntity.ok(service.setDefault(SecurityUtils.currentUserId(), addressId));
    }
}

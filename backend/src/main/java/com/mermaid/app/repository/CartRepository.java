package com.mermaid.app.repository;

import com.mermaid.app.domain.Cart;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {

    @EntityGraph(attributePaths = {"items", "items.listing", "items.listing.species", "items.listing.location"})
    Optional<Cart> findByBuyerId(Long buyerId);
}

package com.mermaid.app.repository;

import com.mermaid.app.domain.CartItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    @EntityGraph(attributePaths = {"listing"})
    Optional<CartItem> findByCart_IdAndListing_Id(Long cartId, Long listingId);
}

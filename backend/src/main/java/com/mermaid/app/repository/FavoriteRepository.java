package com.mermaid.app.repository;

import com.mermaid.app.domain.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    List<Favorite> findAllByBuyerIdAndTargetTypeOrderByCreatedAtDesc(
            Long buyerId, Favorite.TargetType targetType);

    List<Favorite> findAllByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    Optional<Favorite> findByBuyerIdAndTargetTypeAndTargetId(
            Long buyerId, Favorite.TargetType targetType, Long targetId);

    Optional<Favorite> findByIdAndBuyerId(Long id, Long buyerId);

    long countByBuyerId(Long buyerId);
}

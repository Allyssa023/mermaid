package com.mermaid.app.repository;

import com.mermaid.app.domain.ShopProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShopProfileRepository extends JpaRepository<ShopProfile, Long> {

    Optional<ShopProfile> findByVendorIdAndIsDeletedFalse(Long vendorId);

    Optional<ShopProfile> findBySlugAndIsDeletedFalse(String slug);

    boolean existsBySlugAndIsDeletedFalseAndIdNot(String slug, Long id);
}

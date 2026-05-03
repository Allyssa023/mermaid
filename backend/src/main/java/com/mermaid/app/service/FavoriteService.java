package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.Favorite;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.DemandListingMapper;
import com.mermaid.app.model.AddFavoriteRequest;
import com.mermaid.app.model.BuyerFavorite;
import com.mermaid.app.model.FavoriteTargetType;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.FavoriteRepository;
import com.mermaid.app.repository.UserRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class FavoriteService {

    private final FavoriteRepository repo;
    private final DemandListingRepository listingRepo;
    private final UserRepository userRepo;
    private final DemandListingMapper listingMapper;

    public FavoriteService(FavoriteRepository repo,
                            DemandListingRepository listingRepo,
                            UserRepository userRepo,
                            DemandListingMapper listingMapper) {
        this.repo = repo;
        this.listingRepo = listingRepo;
        this.userRepo = userRepo;
        this.listingMapper = listingMapper;
    }

    @Transactional(readOnly = true)
    public List<BuyerFavorite> list(Long buyerId, FavoriteTargetType type) {
        List<Favorite> favs = (type == null)
                ? repo.findAllByBuyerIdOrderByCreatedAtDesc(buyerId)
                : repo.findAllByBuyerIdAndTargetTypeOrderByCreatedAtDesc(
                        buyerId, Favorite.TargetType.valueOf(type.getValue()));

        // Batch-load related listings + vendors so we can hydrate without N+1.
        List<Long> listingIds = favs.stream()
                .filter(f -> f.getTargetType() == Favorite.TargetType.LISTING)
                .map(Favorite::getTargetId).distinct().toList();
        List<Long> vendorIds = favs.stream()
                .filter(f -> f.getTargetType() == Favorite.TargetType.VENDOR)
                .map(Favorite::getTargetId).distinct().toList();

        Map<Long, DemandListing> listingsById = new HashMap<>();
        for (DemandListing l : listingRepo.findAllById(listingIds)) {
            listingsById.put(l.getId(), l);
        }

        Map<Long, User> usersById = new HashMap<>();
        for (User u : userRepo.findAllById(vendorIds)) usersById.put(u.getId(), u);
        // Vendors for any listings are also needed for vendorName mapping.
        for (DemandListing l : listingsById.values()) {
            usersById.computeIfAbsent(l.getVendorId(), id ->
                    userRepo.findById(id).orElse(null));
        }

        return favs.stream().map(f -> toModel(f, listingsById, usersById)).toList();
    }

    @Transactional
    public BuyerFavorite add(Long buyerId, AddFavoriteRequest req) {
        if (req.getTargetType() == null || req.getTargetId() == null) {
            throw new IllegalArgumentException("targetType and targetId are required");
        }
        Favorite.TargetType type = Favorite.TargetType.valueOf(req.getTargetType().getValue());

        // Validate target exists.
        if (type == Favorite.TargetType.LISTING) {
            listingRepo.findById(req.getTargetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + req.getTargetId()));
        } else {
            userRepo.findById(req.getTargetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + req.getTargetId()));
        }

        Optional<Favorite> existing = repo.findByBuyerIdAndTargetTypeAndTargetId(
                buyerId, type, req.getTargetId());
        Favorite fav = existing.orElseGet(() -> {
            Favorite f = new Favorite();
            f.setBuyerId(buyerId);
            f.setTargetType(type);
            f.setTargetId(req.getTargetId());
            return repo.save(f);
        });

        return list(buyerId, req.getTargetType()).stream()
                .filter(bf -> bf.getId().equals(fav.getId()))
                .findFirst()
                .orElseGet(() -> toModel(fav, Map.of(), Map.of()));
    }

    @Transactional
    public void removeById(Long buyerId, Long favoriteId) {
        repo.findByIdAndBuyerId(favoriteId, buyerId).ifPresent(repo::delete);
    }

    @Transactional
    public void removeByTarget(Long buyerId, FavoriteTargetType type, Long targetId) {
        if (type == null || targetId == null) {
            throw new IllegalArgumentException("targetType and targetId are required");
        }
        repo.findByBuyerIdAndTargetTypeAndTargetId(
                        buyerId, Favorite.TargetType.valueOf(type.getValue()), targetId)
                .ifPresent(repo::delete);
    }

    private BuyerFavorite toModel(Favorite f,
                                   Map<Long, DemandListing> listingsById,
                                   Map<Long, User> usersById) {
        BuyerFavorite bf = new BuyerFavorite(f.getId(),
                FavoriteTargetType.valueOf(f.getTargetType().name()),
                f.getTargetId(),
                f.getCreatedAt());

        if (f.getTargetType() == Favorite.TargetType.LISTING) {
            DemandListing l = listingsById.get(f.getTargetId());
            if (l != null) {
                String vendorName = Optional.ofNullable(usersById.get(l.getVendorId()))
                        .map(User::getFullName).orElse("Unknown Vendor");
                bf.setListing(JsonNullable.of(listingMapper.toModel(l, vendorName)));
            }
        } else {
            User vendor = usersById.get(f.getTargetId());
            if (vendor != null) {
                bf.setVendor(JsonNullable.of(listingMapper.toVendorProfile(vendor)));
            }
        }
        return bf;
    }
}

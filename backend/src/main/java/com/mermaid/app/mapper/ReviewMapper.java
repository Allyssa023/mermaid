package com.mermaid.app.mapper;

import com.mermaid.app.domain.Review;
import com.mermaid.app.domain.User;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class ReviewMapper {

    private static final long EDIT_WINDOW_DAYS = 7;

    public com.mermaid.app.model.Review toModel(Review entity, Long currentUserId, User reviewer) {
        com.mermaid.app.model.Review m = new com.mermaid.app.model.Review(
                entity.getId(),
                entity.getOrderId(),
                entity.getReviewerId(),
                entity.getVendorId(),
                entity.getRating().intValue(),
                entity.getCreatedAt());

        m.setReviewerName(JsonNullable.of(reviewer != null ? reviewer.getFullName() : null));
        m.setComment(JsonNullable.of(entity.getComment()));
        m.setPhotoUrls(entity.getPhotoUrls() == null ? List.of() : entity.getPhotoUrls());
        m.setUpdatedAt(JsonNullable.of(entity.getUpdatedAt()));
        m.setEditable(currentUserId != null
                && currentUserId.equals(entity.getReviewerId())
                && isWithinEditWindow(entity.getCreatedAt()));
        return m;
    }

    private static boolean isWithinEditWindow(OffsetDateTime createdAt) {
        if (createdAt == null) return false;
        return ChronoUnit.DAYS.between(createdAt, OffsetDateTime.now()) <= EDIT_WINDOW_DAYS;
    }
}

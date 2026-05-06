package com.mermaid.app.mapper;

import com.mermaid.app.domain.InventoryLot;
import com.mermaid.app.model.InventoryLotResponse;
import com.mermaid.app.repository.FishSpeciesRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class InventoryLotMapper {

    private final FishSpeciesRepository speciesRepo;

    public InventoryLotMapper(FishSpeciesRepository speciesRepo) {
        this.speciesRepo = speciesRepo;
    }

    public InventoryLotResponse toDto(InventoryLot entity) {
        InventoryLotResponse dto = new InventoryLotResponse(
                entity.getId(),
                entity.getVendorId(),
                entity.getSpeciesId(),
                entity.getReceivedAt(),
                toDouble(entity.getInitialKg()),
                toDouble(entity.getRemainingKg()),
                entity.getCreatedAt()
        );
        String speciesName = speciesRepo.findById(entity.getSpeciesId())
                .map(s -> s.getCommonName())
                .orElse(null);
        dto.setSpeciesName(JsonNullable.of(speciesName));
        dto.setSourceProcurementOrderId(JsonNullable.of(entity.getSourceProcurementOrderId()));
        dto.setCostPerKg(JsonNullable.of(toDouble(entity.getCostPerKg())));
        dto.setFreshnessGradedAt(JsonNullable.of(entity.getFreshnessGradedAt()));
        return dto;
    }

    private static Double toDouble(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }
}

package com.mermaid.app.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.List;

@Data
public class MarineAllConditionsDto {
    private List<MarineZoneConditionsDto> zones;
    @JsonProperty("generated_at") private OffsetDateTime generatedAt;
}

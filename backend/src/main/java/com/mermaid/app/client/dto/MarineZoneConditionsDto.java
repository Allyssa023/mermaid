package com.mermaid.app.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class MarineZoneConditionsDto {
    private MarineZoneDto zone;
    private OffsetDateTime timestamp;
    private MarineDataDto marine;
    private MarineWeatherDto weather;
    private MarineRiskDto risk;
    @JsonProperty("data_source") private String dataSource;
}

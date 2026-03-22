package com.mermaid.app.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class MarineDataDto {
    @JsonProperty("wave_height_m")    private Double waveHeightM;
    @JsonProperty("swell_height_m")   private Double swellHeightM;
    @JsonProperty("swell_period_s")   private Double swellPeriodS;
    @JsonProperty("swell_direction_deg") private Double swellDirectionDeg;
}

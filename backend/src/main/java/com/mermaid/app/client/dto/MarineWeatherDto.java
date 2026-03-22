package com.mermaid.app.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class MarineWeatherDto {
    @JsonProperty("wind_speed_kmh")    private double windSpeedKmh;
    @JsonProperty("wind_direction_deg") private double windDirectionDeg;
    @JsonProperty("wind_gusts_kmh")    private double windGustsKmh;
    @JsonProperty("precipitation_mm")  private double precipitationMm;
    @JsonProperty("temperature_c")     private double temperatureC;
    @JsonProperty("cloud_cover_pct")   private double cloudCoverPct;
}

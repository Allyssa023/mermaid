package com.mermaid.app.mapper;

import com.mermaid.app.client.dto.MarineAllConditionsDto;
import com.mermaid.app.client.dto.MarineDataDto;
import com.mermaid.app.client.dto.MarineRiskDto;
import com.mermaid.app.client.dto.MarineWeatherDto;
import com.mermaid.app.client.dto.MarineZoneConditionsDto;
import com.mermaid.app.client.dto.MarineZoneDto;
import com.mermaid.app.model.*;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MarineConditionsMapperTest {

    private final MarineConditionsMapper mapper = new MarineConditionsMapper();

    private MarineZoneConditionsDto sampleZoneDto() {
        MarineZoneDto zone = new MarineZoneDto();
        zone.setId("manila_bay");
        zone.setName("Manila Bay");
        zone.setRegion("Luzon");
        zone.setLat(14.50);
        zone.setLng(120.80);

        MarineDataDto marine = new MarineDataDto();
        marine.setWaveHeightM(1.2);
        marine.setSwellHeightM(0.8);
        marine.setSwellPeriodS(7.0);
        marine.setSwellDirectionDeg(135.0);

        MarineWeatherDto weather = new MarineWeatherDto();
        weather.setWindSpeedKmh(20.0);
        weather.setWindDirectionDeg(90.0);
        weather.setWindGustsKmh(30.0);
        weather.setPrecipitationMm(0.0);
        weather.setTemperatureC(28.0);
        weather.setCloudCoverPct(10.0);

        MarineRiskDto risk = new MarineRiskDto();
        risk.setLevel("SAFE");
        risk.setScore(1);
        risk.setFactors(List.of("Wave height 1.2 m"));
        risk.setAdvisory("Sea conditions are safe for fishing.");

        MarineZoneConditionsDto dto = new MarineZoneConditionsDto();
        dto.setZone(zone);
        dto.setTimestamp(OffsetDateTime.parse("2026-03-22T08:00:00Z"));
        dto.setMarine(marine);
        dto.setWeather(weather);
        dto.setRisk(risk);
        dto.setDataSource("Open-Meteo");
        return dto;
    }

    @Test
    void toResponse_mapsAllZoneFields() {
        MarineConditionsResponse r = mapper.toResponse(sampleZoneDto());
        assertThat(r.getZoneId()).isEqualTo("manila_bay");
        assertThat(r.getZoneName()).isEqualTo("Manila Bay");
        assertThat(r.getRegion()).isEqualTo("Luzon");
        assertThat(r.getLat()).isEqualTo(14.50);
        assertThat(r.getLng()).isEqualTo(120.80);
        assertThat(r.getDataSource()).isEqualTo("Open-Meteo");
    }

    @Test
    void toResponse_mapsTimestampToObservedAt() {
        MarineConditionsResponse r = mapper.toResponse(sampleZoneDto());
        assertThat(r.getObservedAt()).isNotNull();
    }

    @Test
    void toResponse_mapsRiskAssessment() {
        MarineConditionsResponse r = mapper.toResponse(sampleZoneDto());
        assertThat(r.getRisk().getLevel().getValue()).isEqualTo("SAFE");
        assertThat(r.getRisk().getScore()).isEqualTo(1);
        assertThat(r.getRisk().getFactors()).containsExactly("Wave height 1.2 m");
        assertThat(r.getRisk().getAdvisory()).isEqualTo("Sea conditions are safe for fishing.");
    }

    @Test
    void toResponse_mapsMarine_nullWaveHeightAllowed() {
        MarineZoneConditionsDto dto = sampleZoneDto();
        dto.getMarine().setWaveHeightM(null);
        MarineConditionsResponse r = mapper.toResponse(dto);
        assertThat(r.getMarine().getWaveHeightM()).isEqualTo(JsonNullable.of(null));
    }

    @Test
    void toResponse_mapsWeather() {
        MarineConditionsResponse r = mapper.toResponse(sampleZoneDto());
        assertThat(r.getWeather().getWindSpeedKmh()).isEqualTo(20.0);
        assertThat(r.getWeather().getTemperatureC()).isEqualTo(28.0);
    }

    @Test
    void toAllResponse_mapsGeneratedAtAndZonesList() {
        MarineZoneConditionsDto zoneDto = sampleZoneDto();
        MarineAllConditionsDto all = new MarineAllConditionsDto();
        all.setZones(List.of(zoneDto));
        all.setGeneratedAt(OffsetDateTime.parse("2026-03-22T08:00:00Z"));

        AllMarineConditionsResponse r = mapper.toAllResponse(all);
        assertThat(r.getGeneratedAt()).isNotNull();
        assertThat(r.getZones()).hasSize(1);
        assertThat(r.getZones().get(0).getZoneId()).isEqualTo("manila_bay");
    }
}

package com.mermaid.app.mapper;

import com.mermaid.app.client.dto.*;
import com.mermaid.app.model.*;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class MarineConditionsMapper {

    public MarineConditionsResponse toResponse(MarineZoneConditionsDto dto) {
        MarineConditionsResponse r = new MarineConditionsResponse();
        r.setZoneId(dto.getZone().getId());
        r.setZoneName(dto.getZone().getName());
        r.setRegion(dto.getZone().getRegion());
        r.setLat(dto.getZone().getLat());
        r.setLng(dto.getZone().getLng());
        r.setObservedAt(dto.getTimestamp());
        r.setDataSource(dto.getDataSource());
        r.setRisk(mapRisk(dto.getRisk()));
        r.setMarine(mapMarine(dto.getMarine()));
        r.setWeather(mapWeather(dto.getWeather()));
        return r;
    }

    public AllMarineConditionsResponse toAllResponse(MarineAllConditionsDto dto) {
        AllMarineConditionsResponse r = new AllMarineConditionsResponse();
        r.setGeneratedAt(dto.getGeneratedAt());
        r.setZones(dto.getZones().stream().map(this::toResponse).collect(Collectors.toList()));
        return r;
    }

    private RiskAssessmentDto mapRisk(MarineRiskDto src) {
        RiskAssessmentDto r = new RiskAssessmentDto();
        r.setLevel(RiskLevel.fromValue(src.getLevel()));
        r.setScore(src.getScore());
        r.setFactors(src.getFactors());
        r.setAdvisory(src.getAdvisory());
        return r;
    }

    private com.mermaid.app.model.MarineDataDto mapMarine(com.mermaid.app.client.dto.MarineDataDto src) {
        com.mermaid.app.model.MarineDataDto r = new com.mermaid.app.model.MarineDataDto();
        r.setWaveHeightM(JsonNullable.of(src.getWaveHeightM()));
        r.setSwellHeightM(JsonNullable.of(src.getSwellHeightM()));
        r.setSwellPeriodS(JsonNullable.of(src.getSwellPeriodS()));
        r.setSwellDirectionDeg(JsonNullable.of(src.getSwellDirectionDeg()));
        return r;
    }

    private WeatherDataDto mapWeather(MarineWeatherDto src) {
        WeatherDataDto r = new WeatherDataDto();
        r.setWindSpeedKmh(src.getWindSpeedKmh());
        r.setWindDirectionDeg(src.getWindDirectionDeg());
        r.setWindGustsKmh(src.getWindGustsKmh());
        r.setPrecipitationMm(src.getPrecipitationMm());
        r.setTemperatureC(src.getTemperatureC());
        r.setCloudCoverPct(src.getCloudCoverPct());
        return r;
    }
}

package com.mermaid.app.client.dto;

import lombok.Data;

@Data
public class MarineZoneDto {
    private String id;
    private String name;
    private double lat;
    private double lng;
    private String region;
}

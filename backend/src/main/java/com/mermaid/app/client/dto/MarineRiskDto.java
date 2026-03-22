package com.mermaid.app.client.dto;

import lombok.Data;
import java.util.List;

@Data
public class MarineRiskDto {
    private String level;   // "SAFE", "CAUTION", or "UNSAFE"
    private int score;
    private List<String> factors;
    private String advisory;
}

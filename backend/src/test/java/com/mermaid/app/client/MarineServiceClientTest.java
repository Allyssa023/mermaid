package com.mermaid.app.client;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import com.mermaid.app.client.dto.MarineAllConditionsDto;
import com.mermaid.app.client.dto.MarineZoneConditionsDto;
import com.mermaid.app.exception.MarineServiceUnavailableException;
import com.mermaid.app.exception.ResourceNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.*;

class MarineServiceClientTest {

    private WireMockServer wireMock;
    private MarineServiceClient client;

    // Minimal valid JSON for a single zone (all required fields)
    private static final String ZONE_JSON = """
        {
          "zone": {"id":"manila_bay","name":"Manila Bay","lat":14.5,"lng":120.8,"region":"Luzon"},
          "timestamp": "2026-03-22T08:00:00Z",
          "marine": {"wave_height_m":1.0,"swell_height_m":0.5,"swell_period_s":6.0,"swell_direction_deg":90.0},
          "weather": {"wind_speed_kmh":20.0,"wind_direction_deg":180.0,"wind_gusts_kmh":25.0,
                      "precipitation_mm":0.0,"temperature_c":28.0,"cloud_cover_pct":10.0},
          "risk": {"level":"SAFE","score":1,"factors":["Wave height 1.0 m"],"advisory":"Safe."},
          "data_source": "Open-Meteo"
        }
        """;

    private static final String ALL_JSON = """
        {
          "zones": [%s],
          "generated_at": "2026-03-22T08:00:00Z"
        }
        """.formatted(ZONE_JSON);

    @BeforeEach
    void setUp() {
        wireMock = new WireMockServer(WireMockConfiguration.wireMockConfig().dynamicPort());
        wireMock.start();
        client = new MarineServiceClient(
            "http://localhost:" + wireMock.port(),
            "test-api-key",
            5
        );
    }

    @AfterEach
    void tearDown() {
        wireMock.stop();
    }

    @Test
    void getAllConditions_happyPath_returnsDto() {
        wireMock.stubFor(get(urlEqualTo("/api/conditions"))
            .withHeader("X-API-Key", equalTo("test-api-key"))
            .willReturn(okJson(ALL_JSON)));

        MarineAllConditionsDto result = client.getAllConditions();

        assertThat(result.getZones()).hasSize(1);
        assertThat(result.getZones().get(0).getZone().getId()).isEqualTo("manila_bay");
        assertThat(result.getGeneratedAt()).isNotNull();
    }

    @Test
    void getAllConditions_503ThenSuccess_retriesOnce() {
        wireMock.stubFor(get(urlEqualTo("/api/conditions"))
            .inScenario("retry").whenScenarioStateIs("Started")
            .willReturn(serverError())
            .willSetStateTo("retried"));
        wireMock.stubFor(get(urlEqualTo("/api/conditions"))
            .inScenario("retry").whenScenarioStateIs("retried")
            .willReturn(okJson(ALL_JSON)));

        MarineAllConditionsDto result = client.getAllConditions();
        assertThat(result.getZones()).hasSize(1);
        wireMock.verify(2, getRequestedFor(urlEqualTo("/api/conditions")));
    }

    @Test
    void getAllConditions_503Twice_throwsUnavailable() {
        wireMock.stubFor(get(urlEqualTo("/api/conditions"))
            .willReturn(serverError()));

        assertThatThrownBy(() -> client.getAllConditions())
            .isInstanceOf(MarineServiceUnavailableException.class);
        wireMock.verify(2, getRequestedFor(urlEqualTo("/api/conditions")));
    }

    @Test
    void getZoneConditions_404_throwsResourceNotFound() {
        wireMock.stubFor(get(urlEqualTo("/api/conditions/bad_zone"))
            .willReturn(notFound()));

        assertThatThrownBy(() -> client.getZoneConditions("bad_zone"))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("bad_zone");
    }

    @Test
    void getZoneConditions_happyPath_returnsDto() {
        wireMock.stubFor(get(urlEqualTo("/api/conditions/manila_bay"))
            .willReturn(okJson(ZONE_JSON)));

        MarineZoneConditionsDto result = client.getZoneConditions("manila_bay");
        assertThat(result.getZone().getId()).isEqualTo("manila_bay");
        assertThat(result.getRisk().getLevel()).isEqualTo("SAFE");
    }
}

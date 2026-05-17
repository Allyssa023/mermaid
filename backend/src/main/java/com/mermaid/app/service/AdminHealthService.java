package com.mermaid.app.service;

import com.mermaid.app.model.HealthCheck;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.FileSystems;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class AdminHealthService {

    private static final Logger log = LoggerFactory.getLogger(AdminHealthService.class);

    private final DataSource dataSource;
    private final String marineServiceUrl;

    public AdminHealthService(DataSource dataSource,
                              @Value("${marine.service.url}") String marineServiceUrl) {
        this.dataSource = dataSource;
        this.marineServiceUrl = marineServiceUrl;
    }

    public List<HealthCheck> getHealthChecks() {
        List<HealthCheck> checks = new ArrayList<>();
        checks.add(checkDatabase());
        checks.add(checkMarineService());
        checks.add(checkStorage());
        checks.add(staticCheck("Mail queue", "N_A", "Not monitored"));
        checks.add(staticCheck("WebSocket", "N_A", "Not monitored"));
        return checks;
    }

    private HealthCheck checkDatabase() {
        long start = System.currentTimeMillis();
        try (var conn = dataSource.getConnection();
             var stmt = conn.createStatement()) {
            stmt.execute("SELECT 1");
            long ms = System.currentTimeMillis() - start;
            return health("PostgreSQL", "OK", "p95 " + ms + "ms · connection OK");
        } catch (Exception e) {
            return health("PostgreSQL", "DOWN", e.getMessage());
        }
    }

    private HealthCheck checkMarineService() {
        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3)).build();
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(marineServiceUrl + "/health"))
                .timeout(Duration.ofSeconds(3)).GET().build();
            HttpResponse<Void> resp = client.send(req, HttpResponse.BodyHandlers.discarding());
            String status = resp.statusCode() < 400 ? "OK" : "WARN";
            return health("Marine data (Open-Meteo)", status, "HTTP " + resp.statusCode());
        } catch (Exception e) {
            return health("Marine data (Open-Meteo)", "WARN", "Unreachable: " + e.getMessage());
        }
    }

    private HealthCheck checkStorage() {
        try {
            var store = FileSystems.getDefault().getFileStores().iterator().next();
            long total = store.getTotalSpace();
            long usable = store.getUsableSpace();
            if (total == 0) return health("Storage", "OK", "N/A");
            int usedPct = (int) ((total - usable) * 100 / total);
            String status = usedPct > 80 ? "WARN" : "OK";
            return health("Storage", status, usedPct + "% used");
        } catch (IOException e) {
            return health("Storage", "WARN", "Unable to read disk info");
        }
    }

    private HealthCheck staticCheck(String name, String status, String detail) {
        return health(name, status, detail);
    }

    private HealthCheck health(String name, String status, String detail) {
        HealthCheck h = new HealthCheck();
        h.setName(name);
        h.setStatus(HealthCheck.StatusEnum.fromValue(status));
        h.setDetail(detail);
        return h;
    }
}

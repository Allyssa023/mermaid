package com.mermaid.app.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Loads a {@code .env} file at startup so {@code ${VAR:default}} placeholders
 * in {@code application.properties} can read its values. Looks first in the
 * working directory (for {@code ./mvnw spring-boot:run} from {@code backend/})
 * then one level up (repo root). First file found wins. Silent no-op if no
 * file is present (production / docker).
 *
 * <p>Registered via {@code META-INF/spring.factories} so it runs before
 * normal property resolution.
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final List<String> CANDIDATE_PATHS = List.of(
            "./.env",
            "../.env"
    );
    private static final String SOURCE_NAME = "dotenv";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        for (String candidate : CANDIDATE_PATHS) {
            Path p = Paths.get(candidate).toAbsolutePath().normalize();
            if (Files.isRegularFile(p)) {
                Map<String, Object> props = parse(p);
                if (!props.isEmpty()) {
                    environment.getPropertySources().addFirst(new MapPropertySource(SOURCE_NAME, props));
                    System.out.println("[dotenv] loaded " + props.size() + " entries from " + p);
                }
                return;
            }
        }
    }

    private static Map<String, Object> parse(Path file) {
        Map<String, Object> out = new HashMap<>();
        try {
            for (String raw : Files.readAllLines(file)) {
                String line = raw.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                int eq = line.indexOf('=');
                if (eq <= 0) continue;
                String key = line.substring(0, eq).trim();
                String value = line.substring(eq + 1).trim();
                // Strip surrounding quotes if present.
                if (value.length() >= 2
                        && ((value.startsWith("\"") && value.endsWith("\""))
                            || (value.startsWith("'") && value.endsWith("'")))) {
                    value = value.substring(1, value.length() - 1);
                }
                out.put(key, value);
            }
        } catch (Exception e) {
            System.err.println("[dotenv] failed to read " + file + ": " + e.getMessage());
        }
        return out;
    }
}

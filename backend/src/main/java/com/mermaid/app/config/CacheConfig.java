package com.mermaid.app.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.mermaid.app.model.AllMarineConditionsResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Provides a raw Caffeine cache for the all-zones marine conditions aggregate.
 *
 * NOTE: @EnableCaching is intentionally NOT used. We inject and use this
 * Cache<K,V> bean directly — no Spring CacheManager abstraction involved.
 * Do NOT add @Cacheable annotations anywhere in the marine integration.
 */
@Configuration
public class CacheConfig {

    @Value("${marine.cache.conditions-ttl-seconds:300}")
    private long conditionsTtlSeconds;

    @Bean
    public Cache<String, AllMarineConditionsResponse> marineConditionsCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(conditionsTtlSeconds, TimeUnit.SECONDS)
                .maximumSize(1) // single entry: key="all", value=all-zones aggregate
                .build();
    }
}

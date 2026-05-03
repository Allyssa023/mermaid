package com.mermaid.app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enables async processing for event listeners (notifications).
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}

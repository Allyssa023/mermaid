package com.mermaid.app.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Sends transactional auth emails via Mailtrap HTTP API (avoids SMTP port blocking in Docker).
 * API docs: https://api-docs.mailtrap.io/docs/mailtrap-api-docs/bcf61cdc1547e-send-email-early-access
 */
@Service
public class EmailService {

    private static final String MAILTRAP_API_URL = "https://sandbox.api.mailtrap.io/api/send/";
    private static final String FROM_EMAIL = "noreply@mermaid.app";
    private static final String FROM_NAME  = "MERMAID";

    private final RestTemplate restTemplate = new RestTemplate();
    private final String frontendUrl;
    private final String apiToken;
    private final String inboxId;

    public EmailService(
            @Value("${app.frontend-url}") String frontendUrl,
            @Value("${mailtrap.api-token}") String apiToken,
            @Value("${mailtrap.inbox-id}") String inboxId) {
        this.frontendUrl = frontendUrl;
        this.apiToken    = apiToken;
        this.inboxId     = inboxId;
    }

    public void sendVerificationEmail(String to, String token) {
        String link = frontendUrl + "/?verify=" + token;
        send(to, "MERMAID — Verify Your Email",
            "Welcome to MERMAID!\n\n" +
            "Click the link below to verify your email address:\n\n" +
            link + "\n\n" +
            "This link expires in 24 hours.\n\n" +
            "If you didn't create an account, you can safely ignore this email.\n\n" +
            "— The MERMAID Team");
    }

    public void sendPasswordResetEmail(String to, String token) {
        String link = frontendUrl + "/?token=" + token;
        send(to, "MERMAID — Reset Your Password",
            "You requested a password reset.\n\n" +
            "Click the link below to set a new password:\n\n" +
            link + "\n\n" +
            "This link expires in 1 hour.\n" +
            "If you didn't request this, you can safely ignore this email.\n\n" +
            "— The MERMAID Team");
    }

    public void sendOtpEmail(String to, String code) {
        send(to, "MERMAID — Your Login Code",
            "Your login verification code is:\n\n" +
            "    " + code + "\n\n" +
            "This code expires in 5 minutes.\n" +
            "If you didn't try to log in, please change your password immediately.\n\n" +
            "— The MERMAID Team");
    }

    private void send(String to, String subject, String text) {
        Map<String, Object> body = Map.of(
            "from",    Map.of("email", FROM_EMAIL, "name", FROM_NAME),
            "to",      List.of(Map.of("email", to)),
            "subject", subject,
            "text",    text
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiToken);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                MAILTRAP_API_URL + inboxId,
                new HttpEntity<>(body, headers),
                String.class
            );
            if (!response.getStatusCode().is2xxSuccessful()) {
                System.err.println("[EmailService] Mailtrap API error " + response.getStatusCode() + ": " + response.getBody());
            }
        } catch (Exception e) {
            System.err.println("[EmailService] Failed to send email to " + to + ": " + e.getMessage());
        }
    }
}

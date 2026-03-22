package com.mermaid.app.exception;

import com.mermaid.app.model.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class MarineServiceUnavailableExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void marine503_returns503WithMessage() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/marine/conditions");
        MarineServiceUnavailableException ex =
            new MarineServiceUnavailableException("Marine service unavailable after retry");

        ResponseEntity<ErrorResponse> response =
            handler.handleMarineServiceUnavailable(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Marine service unavailable after retry");
        assertThat(response.getBody().getStatus()).isEqualTo(503);
    }
}

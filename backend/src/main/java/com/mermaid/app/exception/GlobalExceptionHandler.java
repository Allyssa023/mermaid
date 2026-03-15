package com.mermaid.app.exception;

import com.mermaid.app.model.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;

/**
 * Maps domain exceptions to HTTP responses with ErrorResponse body.
 * Ensures consistent error format and avoids leaking internal details.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(
            InvalidCredentialsException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.UNAUTHORIZED, ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleEmailAlreadyExists(
            EmailAlreadyExistsException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT, ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.NOT_FOUND, ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.FORBIDDEN, "Access denied");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<ErrorResponse> handleNotImplemented(
            UnsupportedOperationException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.NOT_IMPLEMENTED, ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(body);
    }

    private static ErrorResponse errorResponse(String path, HttpStatus status, String message) {
        ErrorResponse r = new ErrorResponse();
        r.setTimestamp(OffsetDateTime.now());
        r.setStatus(status.value());
        r.setError(status.getReasonPhrase());
        r.setMessage(message);
        r.setPath(path);
        return r;
    }
}

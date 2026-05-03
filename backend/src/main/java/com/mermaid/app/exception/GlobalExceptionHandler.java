package com.mermaid.app.exception;

import com.mermaid.app.model.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
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

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(
            MissingServletRequestParameterException ex, HttpServletRequest request) {
        String message = String.format("Required parameter '%s' is missing", ex.getParameterName());
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.BAD_REQUEST, message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.BAD_REQUEST, ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(EmailNotVerifiedException.class)
    public ResponseEntity<ErrorResponse> handleEmailNotVerified(
            EmailNotVerifiedException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.FORBIDDEN, ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
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

    @ExceptionHandler(MarineServiceUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleMarineServiceUnavailable(
            MarineServiceUnavailableException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    @ExceptionHandler(ListingClosedException.class)
    public ResponseEntity<ErrorResponse> handleListingClosed(
            ListingClosedException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT,
                ex.getMessage(), "LISTING_CLOSED");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(
            IllegalStateException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT,
                ex.getMessage(), "ILLEGAL_STATE");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(DuplicateInterestException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateInterest(
            DuplicateInterestException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT,
                ex.getMessage(), "DUPLICATE_INTEREST");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(TripNotActiveException.class)
    public ResponseEntity<ErrorResponse> handleTripNotActive(
            TripNotActiveException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT, ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex,
            HttpServletRequest request) {
        String message = String.format("Invalid value '%s' for parameter '%s'", ex.getValue(), ex.getName());
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.BAD_REQUEST, message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    private static ErrorResponse errorResponse(String path, HttpStatus status, String message) {
        return errorResponse(path, status, message, null);
    }

    private static ErrorResponse errorResponse(String path, HttpStatus status, String message, String code) {
        ErrorResponse r = new ErrorResponse();
        r.setTimestamp(OffsetDateTime.now());
        r.setStatus(status.value());
        r.setError(status.getReasonPhrase());
        r.setMessage(message);
        r.setPath(path);
        if (code != null) r.setCode(JsonNullable.of(code));
        return r;
    }
}

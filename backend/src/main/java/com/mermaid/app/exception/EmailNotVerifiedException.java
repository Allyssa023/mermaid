package com.mermaid.app.exception;

/**
 * Thrown when a user tries to log in but hasn't verified their email yet.
 * Mapped to HTTP 403 in GlobalExceptionHandler.
 */
public class EmailNotVerifiedException extends RuntimeException {
    public EmailNotVerifiedException() {
        super("Please verify your email before logging in.");
    }
}

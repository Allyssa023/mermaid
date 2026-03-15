package com.mermaid.app.exception;

/**
 * Thrown when registration or admin create user uses an email that is already registered.
 * Maps to 409 Conflict in API.
 */
public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException(String email) {
        super("Email already registered: " + email);
    }
}

package com.mermaid.app.exception;

/**
 * Thrown when login credentials are invalid. Maps to 401 in API.
 */
public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() {
        super("Invalid credentials");
    }
}

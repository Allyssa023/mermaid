package com.mermaid.app.exception;

/**
 * Thrown when a requested resource (e.g. user by id) does not exist. Maps to 404.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}

package com.mermaid.app.exception;

/**
 * Thrown when a Deal state transition or invariant is violated
 * (e.g. accepting a non-PENDING proposal, cancelling an already-terminal deal,
 * starting a duplicate NEGOTIATING deal). Maps to HTTP 409 Conflict.
 */
public class DealConflictException extends RuntimeException {
    public DealConflictException(String message) {
        super(message);
    }
}

package com.mermaid.app.exception;

public class DuplicateInterestException extends RuntimeException {
    public DuplicateInterestException(Long listingId) {
        super("You have already expressed interest in listing " + listingId);
    }
}

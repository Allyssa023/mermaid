package com.mermaid.app.exception;

public class ListingClosedException extends RuntimeException {
    public ListingClosedException(Long listingId) {
        super("Demand listing " + listingId + " is closed and cannot be modified");
    }
}

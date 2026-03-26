package com.mermaid.app.exception;

public class TripNotActiveException extends RuntimeException {
    public TripNotActiveException(Long tripId) {
        super("Trip " + tripId + " is not active");
    }
}

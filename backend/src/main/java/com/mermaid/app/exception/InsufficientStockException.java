package com.mermaid.app.exception;

import java.math.BigDecimal;

public class InsufficientStockException extends RuntimeException {
    public InsufficientStockException(Long listingId, BigDecimal needed, BigDecimal available) {
        super(String.format("Insufficient stock for listing %d: need %.2f kg but only %.2f kg available",
                listingId, needed, available));
    }

    public InsufficientStockException(String message) {
        super(message);
    }
}

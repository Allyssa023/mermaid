package com.mermaid.app.service;

public interface SmsService {
    void send(String toNumber, String message);
}

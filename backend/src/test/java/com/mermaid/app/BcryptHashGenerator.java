package com.mermaid.app;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * One-off: run this main to print a BCrypt hash for "password" (cost 10).
 * Use the output in V2 seed or a fix migration.
 */
public class BcryptHashGenerator {

    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);
        String hash = encoder.encode("password");
        System.out.println(hash);
    }
}

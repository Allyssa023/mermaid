# Backend Authorization — Security Design

This document summarizes the authorization layer and security decisions for the MERMAID backend.

## Overview

- **Authentication**: Stateless JWT (HS256). No server-side sessions; mitigates session hijacking.
- **Authorization**: Role-based access control (RBAC) with roles `ADMIN`, `VENDOR`, `FISHERMAN`. Enforced via Spring Security method security (`@PreAuthorize`) and JWT claims.
- **Storage**: PostgreSQL; passwords stored as BCrypt hashes only.

## Threat Mitigations

| Threat | Mitigation |
|--------|------------|
| **Token forgery** | JWTs signed with server-held secret (HS256). Secret must be ≥256 bits; set `JWT_SECRET` in production. |
| **Privilege escalation** | Role taken from server-issued JWT claim (set at login from DB). Method security enforces `hasRole('ADMIN')` etc. on each endpoint. |
| **Session hijacking** | No sessions; short-lived JWTs. Optional: use refresh tokens and revoke on logout (future). |
| **IDOR (Insecure Direct Object Reference)** | Admin user endpoints use path `userId`; service loads by id. Ownership checks (e.g. vendor can only edit own listings) must be added when implementing those resources. |
| **Credential stuffing / timing** | `PasswordEncoder.matches()` (BCrypt) is constant-time for the comparison. No user enumeration via response time. |
| **Duplicate registration** | Email uniqueness in DB; `existsByEmail` before insert. Returns 409 Conflict. |

## Design Decisions

1. **JWT in token (not cookie)**  
   Bearer token in `Authorization` header keeps the API stateless and avoids CSRF on API calls. Frontend must store the token securely (e.g. memory or httpOnly cookie if served from same origin).

2. **Role in JWT**  
   Role is embedded in the token at login so the resource server can authorize without a DB call per request. Revocation is via `active` flag: `getCurrentUser` and login reject inactive users; existing tokens expire naturally.

3. **Least privilege**  
   Only `/auth/login` and `/auth/register` are public. All other paths require a valid JWT. Admin endpoints additionally require `ROLE_ADMIN` via `@PreAuthorize("hasRole('ADMIN')")`.

4. **Input validation**  
   Request DTOs use Bean Validation (`@Valid`). Email trimmed and lowercased before storage. Passwords never logged or returned.

5. **Defense in depth**  
   JWT signature validation (resource server) + method security (role check) + service-layer checks (e.g. user exists, active). Future: ownership checks on vendor/fisherman resources.

## Configuration

- **JWT**: `jwt.secret` (min 32 chars), `jwt.issuer`, `jwt.expiry-seconds`. Use env vars in production.
- **DB**: No `ddl-auto`; schema from Flyway only. Seed admin password must be changed in production.

## IDOR and Ownership (Future)

When implementing vendor demand listings and trip/catch logs:

- Vendor: ensure `listing.vendorUserId` equals current user id (from JWT sub) on update/delete.
- Fisherman: ensure `trip.userId` (or equivalent) equals current user on trip and catch operations.

Enforce in service layer after loading the resource (e.g. `if (!resource.getUserId().equals(currentUserId)) throw new AccessDeniedException()`).

● Now I have the full picture. Here is the consolidated review.
                                                                                                                                                                
  ---
  Backend Code Review — Production Readiness Assessment                                                                                                         
                                                                                                                                                                  Verdict: Not production-ready. Solid MVP foundation with good architecture, but there are ~15 issues that must be fixed before production. Estimated effort:  
  20-30 hours to reach production-grade.                                                                                                                        
  
  Overall Score: 7/10 (good for an MVP, needs hardening)                                                                                                                                                                                                                                                                          ---                                                                                                                                                             P0 — Must Fix Before Production                                                                                                                                                                                                                                                                                               
  1. Hard delete in CatchLogService violates soft-delete policy

  service/CatchLogService.java:128 — catchLogRepo.deleteById(log.getId()) permanently destroys data. Every other entity uses soft delete. The CatchLog entity   
  doesn't even have an active/isDeleted column.

  Fix: New V10 migration to add is_deleted BOOLEAN NOT NULL DEFAULT false, update entity, change delete() to set flag + save, filter all read queries.

  2. Hardcoded JWT secret accepted in production

  application.properties:22 — Default your-256-bit-secret-change-in-production-use-env-var will be used if JWT_SECRET env var is missing. Anyone reading the    
  repo can forge admin JWTs.

  Fix: Remove the default value (jwt.secret=${JWT_SECRET} with no fallback) so the app fails to start without an explicit secret. Same for DB_PASS and
  MARINE_API_KEY.

  3. Hardcoded admin password in Flyway migration

  V2__seed_admin_user.sql / V3__fix_admin_password_hash.sql — BCrypt hash of "password" baked into an immutable migration that runs on every environment        
  including production.

  Fix: Seed admin via a CommandLineRunner gated by profile/env-var, not a migration.

  4. No MethodArgumentNotValidException handler — validation errors leak Spring internals

  GlobalExceptionHandler.java — The generated API interfaces use @Valid @RequestBody, but when validation fails, the unhandled exception exposes internal class 
  names and field paths.

  Fix: Add handlers for MethodArgumentNotValidException, HttpMessageNotReadableException, and ConstraintViolationException returning sanitized 400 responses.   

  5. No generic fallback exception handler

  Any unhandled exception (NullPointerException, DataIntegrityViolationException, etc.) falls through to Spring's default handler which may include stack       
  traces.

  Fix: Add @ExceptionHandler(Exception.class) that logs full exception server-side, returns generic 500 Internal Server Error to client.

  6. Email case-sensitivity bug allows duplicate registrations

  AuthService.java:66 — existsByEmail(request.getEmail().trim()) checks the original case, but line 70 saves as .toLowerCase(). A user registering Foo@Bar.com  
  bypasses the uniqueness check when foo@bar.com already exists. The same bug exists in AdminUserService.java:41.

  Fix: Normalize to lowercase before the existence check in both services.

  7. No JWT issuer validation on token decode

  SecurityConfig.java:55-62 — The JwtDecoder verifies the HS256 signature but never validates the iss claim. The JwtTokenService sets issuer("mermaid-api") but 
  it's never checked on decode.

  Fix: Add decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("mermaid-api")).

  ---
  P1 — Should Fix Before Production

  8. No pagination on any list endpoint

  Every list query (adminListUsers, browseMarketplace, listTrips, listAdvisories, etc.) loads all rows into memory. This will cause OOM and slow responses as   
  data grows.

  Fix: Add Pageable support starting with the highest-volume endpoints (marketplace, admin user list).

  9. No rate limiting on auth endpoints

  /auth/login and /auth/register are permitAll() with no throttling. Enables brute-force password attacks and registration spam.

  Fix: Add rate limiting (Bucket4j or Resilience4j) — ~10 attempts/min on login, ~5/min on register.

  10. Advisory severity filter ignored when activeOnly=false

  AdvisoryController.java:23-28 — When activeOnly=false, the controller calls listAll() ignoring the severity parameter entirely. The filter silently does      
  nothing.

  Fix: Pass severity to both code paths.

  11. Advisory update() skips date range validation

  AdvisoryService.java:67-79 — create() validates activeTo > activeFrom, but update() does not. An admin can set activeFrom after activeTo.

  Fix: Re-validate after applying partial updates.

  12. NPE risk in DemandListingService.create() on JsonNullable fields

  DemandListingService.java:73-74 — request.getNotes().isPresent() will NPE if getNotes() returns null instead of JsonNullable.undefined(). The update() method 
  correctly uses null guards, but create() does not.

  Fix: Add request.getNotes() != null && guards.

  13. Missing @EntityGraph on CatchLogRepository.findByIdAndTripId

  The list query has @EntityGraph(attributePaths = {"species"}) but the single-fetch does not, causing a lazy-loading query when mapping.

  14. Concurrent trip starts allow multiple ACTIVE trips per fisherman

  TripService.java:42-56 — No check for existing ACTIVE trip before creating a new one.

  Fix: Add existsByFishermanIdAndStatus(fishermanId, ACTIVE) check + a partial unique index in the DB.

  15. Debug logging and show-sql=true enabled by default

  application.properties:14-15, 26-29 — SQL statements and debug output go to stdout in all environments, leaking sensitive data and causing I/O overhead.      

  Fix: Use Spring profiles (application-prod.properties) with INFO/WARN levels.

  ---
  P2 — Should Fix for Robustness

  ┌─────┬─────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────┐
  │  #  │                                      Issue                                      │          Location           │
  ├─────┼─────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
  │ 16  │ DataIntegrityViolationException unhandled — DB constraint violations return 500 │ GlobalExceptionHandler      │
  ├─────┼─────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
  │ 17  │ CORS allowedHeaders("*") with credentials — overly permissive                   │ SecurityConfig.java:69      │
  ├─────┼─────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
  │ 18  │ No updated_at on advisories, trips, catch_logs, fish_species, market_locations  │ Flyway migrations           │
  ├─────┼─────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
  │ 19  │ No password maxLength in OpenAPI spec — BCrypt DoS potential                    │ api.yaml                    │
  ├─────┼─────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
  │ 20  │ Inconsistent soft-delete column naming (active vs is_active vs is_deleted)      │ Across V1, V5, V7           │
  ├─────┼─────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
  │ 21  │ No Spring Boot Actuator — no /health, /metrics, /prometheus endpoints           │ pom.xml                     │
  ├─────┼─────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
  │ 22  │ No HikariCP connection pool tuning                                              │ application.properties      │
  ├─────┼─────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
  │ 23  │ Flyway baseline-on-migrate=true risky for production                            │ application.properties:18   │
  ├─────┼─────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
  │ 24  │ SecurityUtils.currentUserId() throws raw NumberFormatException                  │ SecurityUtils.java:11       │
  ├─────┼─────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
  │ 25  │ Cache thundering herd in MarineController (non-atomic get-or-populate)          │ MarineController.java:31-37 │
  └─────┴─────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────┘

  ---
  Test Coverage Gaps

  ┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────┬──────────┐
  │                                                      Gap                                                      │ Severity │
  ├───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ No tests for AuthController or AuthService — the security backbone is completely untested                     │ Critical │
  ├───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ No tests for AdminUserService — user management CRUD untested                                                 │ High     │
  ├───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ No integration tests at all — Flyway migrations, JPA mappings, transaction behavior are unverified end-to-end │ High     │
  ├───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ Missing happy-path tests for FishSpeciesService.create/update, MarketLocationService.create/update            │ Medium   │
  ├───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ Missing listByTrip and 401 tests for CatchLogController and TripController                                    │ Medium   │
  ├───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ No mapper tests for AdvisoryMapper, DemandListingMapper                                                       │ Medium   │
  ├───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ AppApplicationTests.contextLoads() requires a live DB — will fail in CI                                       │ Medium   │
  └───────────────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────┘

  ---
  What's Done Well

  - API-first with OpenAPI codegen — zero drift between spec and implementation
  - Stateless JWT auth with BCrypt (cost 10), constant-time credential checking, no user enumeration
  - Consistent Service-Repository-Mapper triad with proper @Transactional annotations
  - @EntityGraph on list queries prevents N+1 on the most complex entities
  - Batch vendor name resolution in MarketplaceService avoids N+1
  - Defensive marine service client with retry, timeouts, and clean 503 wrapping
  - Proper soft-delete (except CatchLog) with partial indexes for performance
  - DB-level CHECK constraints on enums, quantities, and prices — defense in depth
  - Idempotent Flyway seeds (ON CONFLICT DO NOTHING)
  - JwtAuthenticationConverter correctly reads the role claim and adds ROLE_ prefix — aligned with JwtTokenService

  ---
  Bottom Line

  The architecture is sound and the code quality is above average for an MVP. The P0 issues (hardcoded secrets, hard delete, missing exception handlers, email  
  bug) are straightforward 1-2 hour fixes each. The biggest production-readiness gaps are: no pagination (will cause outages as data grows), no rate limiting   
  (enables brute force), no actuator/health checks (can't monitor in production), and missing auth tests (the most critical code path is untested). Address the 
  P0s and P1s and this is production-viable.
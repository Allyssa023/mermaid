# Auth Modernization Plan — MERMAID

## Overview

This document tracks the full modernization of the login/register system into a production-grade auth flow. Features are broken into five phases, ordered so each phase is independently testable before the next begins.

---

## Current State (Baseline)

| What exists | Details |
|---|---|
| Email + password login | POST `/auth/login` → HttpOnly JWT cookie (24h) |
| Email + password register | POST `/auth/register` → immediately active |
| JWT auth | HS256, stateless, cookie or Bearer header |
| Role-based routing | FISHERMAN → FishermanDashboard, VENDOR → VendorDashboard, ADMIN → AdminDashboard |
| Basic inline validation | Email format, min 6 char password, passwords match |

---

## Phase 1 — Frontend UX Polish ✅ COMPLETE

> No backend changes. Testable immediately in the running dev server.

### 1a. Password Strength Meter
- **Where:** `frontend/src/pages/LoginPage.jsx` — `Field` component, `RegisterForm`
- **Logic:** `strengthScore(pw)` returns 0–4 based on: length ≥8, uppercase, digit, special char
- **UI:** 4-segment color bar + label below the password field in Register only
- **Labels:** Weak (red `#f87171`) / Fair (amber `#FBBF24`) / Good (blue `#38BDF8`) / Strong (green `#34D399`)
- **CSS:** `.strength-bar`, `.strength-seg`, `.strength-seg--{weak|fair|good|strong}`, `.strength-label--{weak|fair|good|strong}`

### 1b. Real-time Validation (onBlur)
- **Where:** `LoginForm` and `RegisterForm` in `LoginPage.jsx`
- **Behavior:**
  - On `onBlur`: validate that specific field, show error if invalid
  - On `onChange`: clear that field's error immediately (feedback as user corrects)
  - On submit: run full `validate()`, show all remaining errors
- **Password → Confirm link:** changing the password field also clears the confirm error

### 1c. Caps Lock Warning
- **Where:** `Field` component for all `type="password"` inputs
- **Trigger:** `onKeyDown` → `e.getModifierState('CapsLock')`
- **UI:** Amber `⚠ Caps Lock is on` text below the input
- **CSS:** `.caps-warn` — `0.7rem`, `#FBBF24`

### 1d. Terms & Conditions Checkbox (Register)
- **Where:** `RegisterForm` in `LoginPage.jsx`
- **Behavior:**
  - Checkbox required before submit
  - Error: "You must agree to the terms to continue."
  - Submit button disabled while unchecked
  - Ticking checkbox clears the terms error immediately
- **CSS:** `.terms-row` — flex column, 4px gap

### 1e. Remember Me (Frontend wire-up)
- **Where:** `LoginForm`
- **Behavior:** `rememberMe` boolean state wired to existing checkbox; sent in login request body
- **Backend impact:** Phase 3 will consume this flag to set cookie MaxAge

---

## Phase 2 — Backend: Email Infrastructure

> Required by Phases 3 (forgot password, email verification, OTP).

### Files to change

| File | Change |
|---|---|
| `backend/pom.xml` | Add `spring-boot-starter-mail` dependency |
| `backend/src/main/resources/application.properties` | Add mail + frontend URL config |
| `backend/src/main/java/com/mermaid/app/service/EmailService.java` | New — wraps JavaMailSender |
| `.env` (project root) | Add Mailtrap credentials for dev |

### pom.xml addition
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

### application.properties additions
```properties
spring.mail.host=${MAIL_HOST:smtp.mailtrap.io}
spring.mail.port=${MAIL_PORT:587}
spring.mail.username=${MAIL_USERNAME:}
spring.mail.password=${MAIL_PASSWORD:}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
app.frontend-url=${FRONTEND_URL:http://localhost:3000}
```

### EmailService.java (new)
```
com.mermaid.app.service.EmailService
  + sendVerificationEmail(String to, String token)
  + sendPasswordResetEmail(String to, String token)
  + sendOtpEmail(String to, String code)
```
- Uses `JavaMailSender` + `SimpleMailMessage` (plain text, no template engine)
- Links point to `${app.frontend-url}/verify-email?token=` and `/reset-password?token=`

### Dev Setup (Mailtrap)
1. Create free account at [mailtrap.io](https://mailtrap.io)
2. Copy SMTP credentials from inbox settings
3. Add to `.env`:
   ```
   MAIL_HOST=smtp.mailtrap.io
   MAIL_PORT=587
   MAIL_USERNAME=<your-mailtrap-username>
   MAIL_PASSWORD=<your-mailtrap-password>
   ```

---

## Phase 3 — Backend: Schema + New Endpoints

### 3a. Flyway Migration V14

**File:** `backend/src/main/resources/db/migration/V14__add_auth_verification_fields.sql`

```sql
ALTER TABLE users
  ADD COLUMN email_verified         BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN verification_token     VARCHAR(128),
  ADD COLUMN verification_token_exp TIMESTAMPTZ,
  ADD COLUMN reset_token            VARCHAR(128),
  ADD COLUMN reset_token_exp        TIMESTAMPTZ,
  ADD COLUMN otp_code               VARCHAR(6),
  ADD COLUMN otp_code_exp           TIMESTAMPTZ;

-- Backfill: existing users are already verified (pre-date the email verification feature)
UPDATE users SET email_verified = true;
```

### 3b. User Entity Update

**File:** `backend/src/main/java/com/mermaid/app/domain/User.java`

Add 7 new fields with JPA column mappings:
```java
@Column(name = "email_verified", nullable = false)
private boolean emailVerified = false;

@Column(name = "verification_token", length = 128)
private String verificationToken;

@Column(name = "verification_token_exp")
private OffsetDateTime verificationTokenExp;

@Column(name = "reset_token", length = 128)
private String resetToken;

@Column(name = "reset_token_exp")
private OffsetDateTime resetTokenExp;

@Column(name = "otp_code", length = 6)
private String otpCode;

@Column(name = "otp_code_exp")
private OffsetDateTime otpCodeExp;
```

### 3c. api.yaml — New /auth Endpoints

**File:** `backend/src/main/resources/openapi/api.yaml`

After editing, run `./mvnw generate-sources` to regenerate interfaces.

#### New endpoints to add:

| Method | Path | Request body | Response | Public |
|--------|------|-------------|----------|--------|
| POST | `/auth/verify-email` | `{ token: string }` | `LoginResponse` | Yes |
| POST | `/auth/forgot-password` | `{ email: string }` | `{ message: string }` | Yes |
| POST | `/auth/reset-password` | `{ token: string, newPassword: string }` | `{ message: string }` | Yes |
| POST | `/auth/otp/verify` | `{ email: string, code: string }` | `LoginResponse` | Yes |

#### Modified schemas:
- `LoginRequest`: add optional `rememberMe: boolean`
- `LoginResponse`: add optional `otpRequired: boolean` (used when OTP step is pending)

#### New response schemas:
- `MessageResponse`: `{ message: string }`

### 3d. New Exception

**File:** `backend/src/main/java/com/mermaid/app/exception/EmailNotVerifiedException.java`

```java
public class EmailNotVerifiedException extends RuntimeException {
    public EmailNotVerifiedException() {
        super("Please verify your email before logging in.");
    }
}
```

Register in `GlobalExceptionHandler.java` → HTTP 403.

### 3e. AuthService Changes

**File:** `backend/src/main/java/com/mermaid/app/service/AuthService.java`

#### login() — modified
```
1. Find user by email → throw InvalidCredentialsException if not found
2. Check user.active → throw InvalidCredentialsException if false
3. BCrypt.matches() → throw InvalidCredentialsException if wrong password
4. Check user.emailVerified → throw EmailNotVerifiedException if false
5. Generate 6-digit OTP, set user.otpCode + user.otpCodeExp (now + 5 min)
6. Save user, call emailService.sendOtpEmail()
7. Return LoginResponse with otpRequired=true (no JWT yet)
   — also return rememberMe flag to controller for cookie MaxAge
```

#### verifyEmail() — new
```
1. Find user where verificationToken = token → throw ResourceNotFoundException if not found
2. Check verificationTokenExp > now() → throw IllegalArgumentException("Token expired")
3. Set emailVerified=true, clear verificationToken + verificationTokenExp
4. Save user, issue JWT → return LoginResponse
```

#### forgotPassword() — new
```
1. Find user by email (silently ignore if not found — prevent enumeration)
2. Generate UUID token, set resetToken + resetTokenExp (now + 1 hour)
3. Save user, call emailService.sendPasswordResetEmail()
4. Return generic MessageResponse (same message whether email exists or not)
```

#### resetPassword() — new
```
1. Find user where resetToken = token → throw ResourceNotFoundException if not found
2. Check resetTokenExp > now() → throw IllegalArgumentException("Reset link has expired")
3. BCrypt encode newPassword, set passwordHash
4. Clear resetToken + resetTokenExp
5. Save user, return MessageResponse("Password updated successfully")
```

#### verifyOtp() — new
```
1. Find user by email → throw InvalidCredentialsException if not found
2. Check user.otpCode equals code AND otpCodeExp > now()
   → throw InvalidCredentialsException("Invalid or expired code") if either fails
3. Clear otpCode + otpCodeExp
4. Save user, issue JWT → return LoginResponse
```

#### register() — modified
```
After saving the new user:
1. Generate UUID verification token
2. Set user.emailVerified=false, user.verificationToken, user.verificationTokenExp (now + 24h)
3. Save user
4. Call emailService.sendVerificationEmail()
5. Return MessageResponse("Check your email to verify your account")
   (no auto-login — user must verify first)
```

### 3f. AuthController Changes

**File:** `backend/src/main/java/com/mermaid/app/controller/AuthController.java`

- **login**: pass `rememberMe` from request to service; use it to set cookie `maxAge`:
  - `rememberMe=true` → 2592000 seconds (30 days)
  - `rememberMe=false` or absent → -1 (session cookie, deleted on browser close)
- **Wire all new service methods** to the generated interface implementations
- Add `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/otp/verify` to the public endpoints list in `SecurityConfig.java`

### 3g. SecurityConfig Update

**File:** `backend/src/main/java/com/mermaid/app/config/SecurityConfig.java`

Add to the public matchers:
```java
"/auth/verify-email",
"/auth/forgot-password",
"/auth/reset-password",
"/auth/otp/verify"
```

---

## Phase 4 — Frontend: Wire Up New Backend Features

### Files to change

| File | Change |
|---|---|
| `frontend/src/api/auth.js` | Add forgotPassword, resetPassword, verifyOtp, verifyEmail API calls |
| `frontend/src/pages/LoginPage.jsx` | Forgot password panel, OTP step, reset password detection, email verify message |
| `frontend/src/index.css` | OTP input styles, divider styles |

### 4a. api/auth.js additions
```js
export async function forgotPassword(email) { ... }   // POST /auth/forgot-password
export async function resetPassword(token, newPassword) { ... }  // POST /auth/reset-password
export async function verifyOtp(email, code) { ... }  // POST /auth/otp/verify
export async function verifyEmail(token) { ... }       // POST /auth/verify-email
```

### 4b. Login flow — OTP step

The `LoginForm` becomes a 2-step flow:

```
Step 1 [email + password form]
  ↓ submit → POST /auth/login
  ↓ response has otpRequired: true
Step 2 [OTP input]
  → 6-character code input (or 6 individual digit boxes)
  → "Verify" button → POST /auth/otp/verify
  → on success → window.location.reload()
  → "Resend code" link → POST /auth/login again
```

State: add `otpStep: boolean` and `otpEmail: string` to `LoginForm`.

OTP input: single `<input maxLength={6} className="otp-inp" />` styled as a wide monospace field.

### 4c. Forgot Password panel

"Forgot password?" button replaces the login form body with an inline panel (no modal):

```
[← Back]
"Enter your email and we'll send a reset link."
[ email input ]
[ Send reset link ]
→ on success: "If that email exists, a reset link has been sent."
```

State: add `forgotStep: boolean` to `LoginForm`.

### 4d. Reset Password detection

In `LoginPage` main component, on mount check `window.location.search` for `?token=`:

```js
const params = new URLSearchParams(window.location.search)
const resetToken = params.get('token')
```

If token present, render `<ResetPasswordForm token={resetToken} />` instead of the tab card.

`ResetPasswordForm`: new password + confirm inputs → POST `/auth/reset-password` → on success show "Password updated! You can now sign in." + redirect to login.

### 4e. Register → Email verification message

After register success, instead of "Account created! You can now sign in.", show:

```
✉ Check your inbox
We sent a verification link to {email}.
Click the link to activate your account before logging in.
```

When login returns 403 with "verify your email" in the message, show:

```
Your email isn't verified yet.
[Resend verification email]  ← POST /auth/resend-verification (Phase 3 optional endpoint)
```

---

## Phase 5 — Google OAuth

> Requires manual Google Cloud Console setup before backend work can be tested.

### Prerequisites (manual — one-time setup)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use existing)
3. Enable **Google+ API** and **Google Identity**
4. Credentials → Create OAuth 2.0 Client ID → Web application
5. Add authorized redirect URI: `http://localhost:8090/login/oauth2/code/google`
6. Copy Client ID and Client Secret → add to `.env`

### Files to change

| File | Change |
|---|---|
| `backend/pom.xml` | Add `spring-boot-starter-oauth2-client` |
| `backend/src/main/resources/application.properties` | Google OAuth2 config |
| `backend/src/main/resources/db/migration/V15__add_google_id.sql` | `google_id` column |
| `backend/src/main/java/com/mermaid/app/domain/User.java` | Add `googleId` field |
| `backend/src/main/java/com/mermaid/app/config/SecurityConfig.java` | Enable OAuth2 login |
| `backend/src/main/java/com/mermaid/app/security/OAuth2AuthenticationSuccessHandler.java` | New — find/create user, issue JWT |
| `frontend/src/pages/LoginPage.jsx` | "Continue with Google" button |
| `frontend/src/App.jsx` | Role selection screen for new Google users |

### 5a. pom.xml addition
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

### 5b. application.properties additions
```properties
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID:}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET:}
spring.security.oauth2.client.registration.google.scope=openid,email,profile
```

### 5c. V15 Migration
```sql
ALTER TABLE users
  ADD COLUMN google_id VARCHAR(255) UNIQUE;
```

### 5d. OAuth2AuthenticationSuccessHandler logic
```
On Google callback:
1. Extract email + name + googleId from OAuth2User attributes
2. Find user by googleId OR by email
3a. If found by googleId → user already linked → issue JWT → redirect to frontend
3b. If found by email → link googleId to existing account → issue JWT → redirect
3c. If not found → create new User with emailVerified=true, googleId set, role=null
    → issue "pending" JWT with no role claim
    → redirect to frontend /complete-profile
4. For pending users: POST /auth/complete-profile {role: FISHERMAN|VENDOR}
   → set user.role, issue real JWT → redirect to dashboard
```

### 5e. Frontend: Google button
Add above the form body in both Login and Register tabs:

```
[G  Continue with Google]
──────── or ────────
[email/password form]
```

Button navigates to `/oauth2/authorization/google` (handled by Spring Security, no frontend fetch needed).

### 5f. Frontend: Role selection screen
In `App.jsx`, if `user` exists but `user.role === null`:
- Render a `<RoleSelectionPage />` instead of a dashboard
- User picks Fisherman or Vendor
- POST `/auth/complete-profile` → updates role → `loadUser()` → correct dashboard shown

---

## Phase 6 — Facebook OAuth

> Facebook uses OAuth2 but requires the **Facebook Login** product, not standard OpenID Connect. Spring Security supports it natively via its built-in Facebook provider.

### Key difference vs Google
- Facebook does **not** return email by default — you must explicitly request the `email` permission and the user must grant it.
- Facebook profile picture comes from `picture.data.url` (nested), not a flat attribute.
- Facebook's provider is pre-registered in Spring Security (`spring.security.oauth2.client.registration.facebook`), so no custom provider URL config is needed.

### Prerequisites (manual — one-time setup)

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create an App → choose **Consumer** type
3. Add the **Facebook Login** product to the app
4. Settings → Valid OAuth Redirect URIs → add:
   `http://localhost:8090/login/oauth2/code/facebook`
5. App Review → make sure `email` permission is available (it is by default in dev mode)
6. Copy **App ID** and **App Secret** → add to `.env`

> In dev mode Facebook only allows logins from accounts listed as App Testers or Developers on the app.

### Files to change

| File | Change |
|---|---|
| `backend/src/main/resources/application.properties` | Facebook OAuth2 config |
| `backend/src/main/resources/db/migration/V15__add_social_ids.sql` | Add `facebook_id` alongside `google_id` |
| `backend/src/main/java/com/mermaid/app/domain/User.java` | Add `facebookId` field |
| `backend/src/main/java/com/mermaid/app/security/OAuth2AuthenticationSuccessHandler.java` | Handle Facebook attributes |
| `backend/src/main/java/com/mermaid/app/repository/UserRepository.java` | Add `findByFacebookId` |
| `frontend/src/pages/LoginPage.jsx` | "Continue with Facebook" button |

> `pom.xml` and `SecurityConfig` changes are **shared with Phase 5** — `spring-boot-starter-oauth2-client` and `.oauth2Login()` only need to be added once.

### 6a. application.properties additions
```properties
spring.security.oauth2.client.registration.facebook.client-id=${FACEBOOK_APP_ID:}
spring.security.oauth2.client.registration.facebook.client-secret=${FACEBOOK_APP_SECRET:}
spring.security.oauth2.client.registration.facebook.scope=email,public_profile
```

Spring Security's built-in Facebook provider already knows the authorization and token endpoints — no `provider` block needed.

### 6b. V15 Migration (merge with Google if doing both together)
```sql
ALTER TABLE users
  ADD COLUMN google_id   VARCHAR(255) UNIQUE,
  ADD COLUMN facebook_id VARCHAR(255) UNIQUE;
```

If V15 already exists for `google_id`, create **V16__add_facebook_id.sql** instead:
```sql
ALTER TABLE users
  ADD COLUMN facebook_id VARCHAR(255) UNIQUE;
```

### 6c. User.java addition
```java
@Column(name = "facebook_id", length = 255)
private String facebookId;
```

### 6d. UserRepository addition
```java
Optional<User> findByFacebookId(String facebookId);
```

### 6e. OAuth2AuthenticationSuccessHandler — Facebook branch

The existing handler for Google reads from `OAuth2User.getAttributes()`. Facebook returns a different attribute map:

| Attribute | Google key | Facebook key |
|---|---|---|
| Provider user ID | `sub` | `id` |
| Email | `email` | `email` (may be absent) |
| Full name | `name` | `name` |

Add a provider detection branch:

```java
String registrationId = oAuth2AuthenticationToken.getAuthorizedClientRegistrationId();
// "google" or "facebook"

if ("facebook".equals(registrationId)) {
    String facebookId = attributes.get("id").toString();
    String email      = (String) attributes.get("email"); // may be null
    String name       = (String) attributes.get("name");

    // Find by facebookId first, then by email (if present)
    User user = userRepository.findByFacebookId(facebookId)
        .or(() -> email != null ? userRepository.findByEmail(email) : Optional.empty())
        .orElse(null);

    if (user == null) {
        // New user — create with emailVerified=true (Facebook verified it)
        user = new User();
        user.setFullName(name);
        user.setEmail(email);           // may be null; handle edge case
        user.setFacebookId(facebookId);
        user.setEmailVerified(true);
        user.setActive(true);
        // role left null → triggers role selection screen
        userRepository.save(user);
    } else {
        // Link facebookId if not already linked
        if (user.getFacebookId() == null) {
            user.setFacebookId(facebookId);
            userRepository.save(user);
        }
    }
    // Issue JWT, redirect (same as Google path)
}
```

#### Edge case: Facebook user without email
Some Facebook accounts don't share their email. If `email` is null:
- Still create the user (with `email = null`)
- Skip email-based duplicate check
- The role selection screen still appears for new users
- Consider prompting the user to add an email in their profile settings later

### 6f. Frontend: Facebook button

Add alongside the Google button in the social login section:

```
[G  Continue with Google  ]
[f  Continue with Facebook]
──────── or ────────
[email/password form]
```

Button navigates to `/oauth2/authorization/facebook` (Spring Security handles the redirect, no fetch needed).

Style: Facebook brand color `#1877F2` background, white text, Facebook `f` logo icon.

---

## Implementation Checklist

### Phase 1 — Frontend UX
- [x] Password strength meter (`strengthScore`, 4-segment bar, color labels)
- [x] Real-time onBlur validation + onChange error clearing
- [x] Caps Lock warning on password fields
- [x] Terms & Conditions checkbox with validation
- [x] Remember Me checkbox wired to request body

### Phase 2 — Email Infrastructure
- [x] Add `spring-boot-starter-mail` to `pom.xml`
- [x] ~~Add mail SMTP properties to `application.properties`~~ → **switched to Mailtrap HTTP API** (SMTP ports blocked in Docker/WSL)
- [x] Create `EmailService.java` — rewritten to use `RestTemplate` + Mailtrap sandbox REST API (`https://sandbox.api.mailtrap.io/api/send/{inboxId}`)
- [x] Add `mailtrap.api-token` and `mailtrap.inbox-id` to `application.properties`
- [x] Add `MAILTRAP_API_TOKEN` and `MAILTRAP_INBOX_ID` to `.env` and `docker-compose.yml`

### Phase 3 — Backend Schema + Endpoints
- [x] Write `V14__add_auth_verification_fields.sql`
- [x] Add 7 new fields to `User.java`
- [x] Add 4 new endpoints to `api.yaml`
- [x] Run `./mvnw generate-sources`
- [x] Create `EmailNotVerifiedException.java`
- [x] Register exception in `GlobalExceptionHandler.java`
- [x] Implement `verifyEmail()` in `AuthService`
- [x] Implement `forgotPassword()` in `AuthService`
- [x] Implement `resetPassword()` in `AuthService`
- [x] Implement `verifyOtp()` in `AuthService`
- [x] Modify `login()` — add email_verified check + OTP generation
- [x] Modify `register()` — send verification email, return message
- [x] Update `AuthController` — wire new methods, handle rememberMe cookie MaxAge
- [x] Add new public endpoints to `SecurityConfig`
- [x] Add new public endpoints to API Gateway `JwtAuthGlobalFilter.PUBLIC_PATHS` (verify-email, forgot-password, reset-password, otp/verify, register-message)
- [x] Add SMTP connection timeouts (5s) to prevent request thread blocking on mail failures

### Phase 4 — Frontend Wiring
- [x] Add API calls to `api/auth.js`
- [x] OTP 2-step login flow in `LoginForm`
- [x] Forgot password inline panel in `LoginForm`
- [x] Reset password form (token from URL query param)
- [x] Post-register "check your inbox" message
- [x] Login 403 "not verified" message + resend link
- [x] OTP input CSS (`.otp-inp`)

### Phase 5 — Google OAuth
- [ ] Google Cloud Console setup (manual — user must add redirect URI: `http://localhost:8090/api/login/oauth2/code/google`)
- [x] Add `spring-boot-starter-oauth2-client` to `pom.xml`
- [x] Add Google OAuth properties to `application.properties`
- [x] Write `V15__add_social_auth_fields.sql` (`google_id`, `facebook_id`, nullable role + password_hash)
- [x] Add `googleId` + `facebookId` fields to `User.java`; make role + passwordHash nullable
- [x] Add `findByGoogleId` + `findByFacebookId` to `UserRepository.java`
- [x] Update `JwtTokenService` to handle null role
- [x] Create `OAuth2AuthenticationSuccessHandler.java`
- [x] Update `SecurityConfig` — add oauth2Login, session policy IF_REQUIRED, permit OAuth2 paths
- [x] Add `/auth/complete-profile` endpoint (api.yaml + AuthService + AuthController)
- [x] "Continue with Google" button in `LoginPage.jsx` (both Login and Register tabs)
- [x] `RoleSetupPanel` component in `LoginPage.jsx` for new Google users
- [x] `?setup=role` URL param detection in `LoginPage` → shows role picker
- [x] Add OAuth2 paths to API Gateway `JwtAuthGlobalFilter.PUBLIC_PATHS`
- [x] Add `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to `docker-compose.yml`
- [ ] Add `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to `.env` (user must do after Google Console setup)

### Phase 6 — Facebook OAuth
- [ ] Facebook Developer App setup (manual — user must add redirect URI: `http://localhost:8090/api/login/oauth2/code/facebook`)
- [x] Add Facebook OAuth properties to `application.properties`
- [x] Add `facebook_id` column (combined in V15 with google_id)
- [x] Add `facebookId` field to `User.java`
- [x] Add `findByFacebookId()` to `UserRepository.java`
- [x] Add Facebook branch to `OAuth2AuthenticationSuccessHandler.java`
- [x] Handle null email edge case (Facebook accounts without shared email)
- [x] "Continue with Facebook" button in `LoginPage.jsx` (brand color `#1877F2`)
- [x] Add `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` to `docker-compose.yml`
- [ ] Add `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` to `.env` (user must do after Facebook Developer setup)

---

## Testing Checklist (per Phase)

### Phase 2+3 (email + backend)
- Register → check Mailtrap inbox → click verify link → can now log in
- Register → try to log in before verifying → see "verify your email" message
- Login with valid credentials → receive OTP email → enter code → logged in
- Login with invalid OTP → see error, code still valid until expiry
- "Forgot password?" → enter email → check Mailtrap → click link → reset password → log in with new password
- Reset link used twice → second use rejected ("token expired or invalid")

### Phase 4 (frontend)
- OTP step UI appears after successful password check
- Forgot password panel replaces form without page reload
- Navigating to `/?token=xxx` shows reset password form
- After register, "check your inbox" message shown (not auto-login)

### Phase 5 (Google OAuth)
- "Continue with Google" → Google consent → redirect back → logged in
- New Google user (no account) → redirected to role selection → picks role → correct dashboard
- Existing user logs in via Google → linked to existing account → no duplicate created

### Phase 6 (Facebook OAuth)
- "Continue with Facebook" → Facebook consent → redirect back → logged in
- New Facebook user → role selection screen → correct dashboard
- Facebook user without email → account created with null email → role selection still works
- User who already has account via email → Facebook ID linked, no duplicate account created
- User logs in via both Google and Facebook → same account, both IDs stored

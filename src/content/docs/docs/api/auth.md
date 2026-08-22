---
title: Auth, Registration & Invites
description: /auth/*, /register, and /invites/* -- account creation, login, and invite-code redemption.
sidebar:
  order: 1
---

Covers `/auth/*`, `/register`, and `/invites/*`. See the [REST API Overview](/docs/api/overview/) for the shared JWT format, header variants, and rate-limiting mechanics referenced below.

## Auth (`/auth/*`)

### `GET /auth/me`
Auth required. Not rate-limited (this is the session-restore path, hit on every app boot).

Returns:
```json
{
  "user": {
    "id": "...", "username": "...", "type": "...",
    "profile": { ... }, "prefs": { ... },
    "publicKey": "...",
    "following": "...", "allFollowing": "...", "blocked": "...", "muted": "...", "groups": "...",
    "isServerAdmin": false
  }
}
```
(`following`/`allFollowing`/`blocked`/`muted`/`groups` are the user's System circle IDs.)

### `GET /auth/verify-email?token=`
Unauthenticated. Looks up the user by `emailVerificationToken` (must be unexpired). On success: sets `emailVerified: true`, clears the token, issues a JWT.

Returns `{ user: { ...same shape as register }, token }`. `400` on missing, invalid, or expired token.

### `POST /auth/login`
Unauthenticated, `strictRateLimiter` (5 min / 20 req).

Body -- **strict**, extra fields reject with `400`:
```json
{ "username": "alice", "password": "..." }
```
or
```json
{ "id": "@alice@kwln.org", "password": "..." }
```
(`id` accepts either an actorId `@user@domain` or a server id `@domain`.)

Returns `{ token, user? }`.

| Status | Meaning |
|---|---|
| 401 | bad credentials |
| 403 | `{ error, unverified: true }` -- account requires email verification and isn't verified |

### `POST /auth/forgot-password`
Unauthenticated, `strictRateLimiter`. Body `{ email }`.

Always returns `200 { ok: true, message }` -- **deliberately no enumeration**, silently no-ops if the email doesn't exist. Generates a 1-hour reset token and emails a reset link on success.

### `POST /auth/reset-password`
Unauthenticated, `strictRateLimiter`. Body `{ token, password }` (password >= 8 chars).

`400` on invalid/expired token. On success: sets the new password, issues a fresh JWT, returns `{ ok: true, token }`.

### `POST /auth/resend-verification`
Unauthenticated, `strictRateLimiter`. Body `{ email }`.

Always `200` with a generic message -- no enumeration. No-ops if the `requireEmailVerification` setting is off, or the user is already verified.

## Register (`/register`)

### `POST /register`
Unauthenticated (via the shared `allowUnauthCreateUser`-style path, but declared here with its own `allowUnauth: true`), `strictRateLimiter`.

Body:
```json
{
  "username": "alice",
  "password": "...",
  "email": "alice@example.com",
  "profile": { "name": "Alice" },
  "to": "@public",
  "canReply": "@public",
  "canReact": "@public",
  "inviteCode": "...",
  "acknowledgedRules": ["rule-1", "rule-2"]
}
```

- `username` must match `/^[a-z0-9_]{2,32}$/` -- lowercase, digits, underscore only. Display name goes in `profile.name`, not `username`.
- If `settings.registrationIsOpen === false`, `inviteCode` is required and validated:
  - `404` -- invalid code
  - `410` -- expired, already used, or exhausted
- If the server has configured `rules`, every rule id must appear in `acknowledgedRules` (`400` otherwise); a timestamped acknowledgment snapshot is stored on the new user.
- `409` on duplicate username/id.

:::note[The "Petty Limits" mechanism]
A `PETTY_LIMITS` array (currently containing one entry: `ghostmountain`, capped at 43 registrations server-wide, matched via a fuzzy/partial regex against the normalized username) is a deliberately-kept in-joke restriction. It's real, live code -- not a bug -- per the server's own `CLAUDE.md`. Mentioned here so it doesn't look like unexplained flaky registration behavior if you ever hit it.
:::

**If `requireEmailVerification` is on**: creates the user unverified, emails a verification link, responds `201 { requiresVerification: true, message }` -- **no token yet**, the client must wait for `/auth/verify-email`.

**Otherwise**: `201`:
```json
{
  "user": {
    "id": "...", "actorId": "...", "username": "...", "email": "...",
    "profile": { ... },
    "following": "...", "allFollowing": "...", "blocked": "...", "muted": "...", "groups": "...",
    "createdAt": "...", "updatedAt": "..."
  },
  "token": "..."
}
```

## Invites (`/invites/*`)

Public redemption endpoints -- distinct from the admin-facing `/admin/invites` CRUD (see [Admin](/docs/api/admin/)).

### `GET /invites/:code?email=`
Unauthenticated. Validates an invite code without redeeming it.

Returns:
```json
{
  "valid": true,
  "canRedeem": true,
  "reason": null,
  "invite": {
    "type": "individual",
    "welcomeMessage": "...",
    "expiresAt": "...",
    "emailHint": "a***@example.com",
    "remainingRedemptions": 1
  }
}
```
`404` / `410` with a `reason` on invalid/expired codes.

### `POST /invites/:code/redeem`
Unauthenticated. Body `{ userId, email? }`. Called by clients **after** registration completes, to mark the invite as consumed.

`409` if an open (multi-use) invite was already redeemed by that specific user. `400` on other redemption failures.

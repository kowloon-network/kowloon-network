---
title: AuthClient
description: Registration, login, session restore, and token access.
sidebar:
  order: 1
---

`client.auth` handles registration, login/logout, and session persistence.

## `register(options)`

```js
await client.auth.register({
  username,
  password,
  email,             // optional
  profile,           // optional
  inviteCode,        // optional -- required if the server has registration closed
  acknowledgedRules,
})
```

Posts to `POST /register` (see the [REST API docs](/docs/api/auth/) for server-side validation rules -- username format, invite-code handling, email-verification gating, etc.). On success, stores the returned token and user and returns `{ user, token }`. Throws `AuthenticationError` if `username`/`password` are missing from the call, or if the server's response doesn't include a token.

## `login(options)`

```js
await client.auth.login({ username, password })
// or
await client.auth.login({ id: '@alice@kwln.social', password })
```

Accepts either a bare `username` or a full `id` (`@user@domain`) -- matches the server's own `POST /auth/login` body shape.

## `logout()`

```js
await client.auth.logout()
```

Clears the in-memory user/token and removes the persisted token from storage.

## `restoreSession()`

```js
const user = await client.auth.restoreSession() // null if no valid session
```

Called automatically by `client.init()`. This is a two-step process, not a single trust-the-token read:

1. **Local decode.** The client decodes the stored JWT itself (no signature verification client-side -- that's the server's job) to get an initial `_user` snapshot immediately, with no network round trip.
2. **Server refresh.** It then calls `GET /auth/me` to refresh the fields that are **not** present in the JWT payload: `profile`, `prefs`, `isServerAdmin`, `following`, `allFollowing`, `blocked`, `muted`, `groups`. This refresh is best-effort -- if it fails (offline, server down), `restoreSession()` falls back to the locally-decoded snapshot rather than failing outright.

If the token is missing, malformed, or has no `user.id`, `restoreSession()` logs the user out and returns `null`.

`_decodeToken` handles base64url-to-base64 normalization manually (JWTs are base64url-encoded, not standard base64) and throws `AuthenticationError('Failed to decode token')` on a malformed token.

## Reading the current session

```js
client.auth.getUser()        // sync -- returns the cached user object, or null
await client.auth.getToken() // async -- reads from storage
await client.auth.isAuthenticated() // async
```

`getUser()` is synchronous because it just returns the in-memory cached value set by `login()`/`register()`/`restoreSession()` -- it does not hit the network or storage. `getToken()` and `isAuthenticated()` are async because they read through the storage adapter.

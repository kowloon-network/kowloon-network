---
title: REST API Overview
description: Global request/response behavior shared by every Kowloon REST endpoint.
sidebar:
  order: 0
---

This page covers behavior that applies across the whole REST API, so the per-resource pages don't have to repeat it. Read this first.

## Route mounting

`routes/index.js` auto-mounts every subdirectory of `routes/` that has an `index.js`. The directory name becomes the mount path, with three special cases:

| Directory | Mounted at |
|---|---|
| `home` | `/` |
| `well-known` | `/.well-known` |
| `config` | `/config.json` |
| anything else, e.g. `posts` | `/posts` |

`middleware` and `utils` subdirectories are explicitly skipped -- they're not routes.

Two introspection/dev endpoints live at the top level of this mount:

- **`GET /__routes`** -- no auth. Dumps `{ total, routes: [{ methods, path }] }` for every mounted route except itself.
- **`POST /__test/wipe`** -- mounted **only when `NODE_ENV !== "production"`**. Wipes every Mongo collection except `settings`. No auth required -- the production gate is the only thing stopping this from being catastrophic, so never let `NODE_ENV` drift from `production` on a real deployment.

## Body parsing (parsed three times)

JSON body parsing happens independently at three layers, each with its own limit and content-type matcher:

1. **App level** (`index.js`): `express.json({ limit: "1mb" })` plus `urlencoded`.
2. **`routes/index.js`**: re-parses JSON with a larger limit (`JSON_LIMIT` env, default `2mb`) and a custom type matcher accepting `application/json`, `application/activity+json`, `application/ld+json`, `text/json`, `text/activity+json`, and anything ending in `+json`.
3. **`routes/outbox/index.js`**: parses JSON a *third* time with the same matcher, independent of mount order -- so outbox body parsing doesn't depend on where it lands relative to the `routes/index.js` parser.

If you're sending a large activity payload (e.g. a big embedded object) and hitting unexpected 413s, check which of these three limits you're actually up against -- it's usually the app-level 1MB default, not the outbox-specific one.

## CORS

Origin allowlist is built from:
- `DOMAIN` env (both `https://` and `http://` variants)
- `CORS_ORIGIN` env (comma-separated extra origins)
- `localhost:5173` and `localhost:3000`, **only outside production**

Requests with no `Origin` header -- native clients, server-to-server federation calls -- always pass. `credentials: true`.

:::caution[Local dev + `NODE_ENV=production`]
If your `.env` has `NODE_ENV=production` locally, `localhost:5173` silently drops out of the CORS allowlist. Add it explicitly via `CORS_ORIGIN` if you need production-mode env locally.
:::

## Auth: the `route()` wrapper

Nearly every handler in the codebase is wrapped by `routes/utils/route.js`'s `route(handler, opts)`. The handler receives a single destructured argument:

```js
route(({ req, query, params, body, user, set, setStatus }) => {
  // query, params, body default to {} if absent
  // user is the authenticated user doc, or undefined
  set("key", value)   // builds the response body -- setting `error` to a falsy value is a silent no-op
  setStatus(201)       // overrides the default 200
})
```

**Auth resolution** (`attachUserFromToken`): tries an RS256 JWT first (via `jose`, key = `settings.publicKey`, issuer `https://<domain>`), then falls back to HMAC via `JWT_SECRET`/`JWT_KEY`. Accepted headers, in no particular priority order -- first one present wins:

- `Authorization: Bearer <jwt>` or `Authorization: Token <jwt>`
- `x-auth-token`
- `x-access-token`
- `x-token`
- `auth-token`
- `x-jwt`

**Who needs auth**: `SAFE_METHODS` (`GET`, `HEAD`, `OPTIONS`) default to `allowUnauth: true`. Every other method requires auth unless the route explicitly passes `allowUnauth: true`.

**Registration special case**: `allowUnauthCreateUser` (default `true` specifically on `/outbox`) lets an unauthenticated `POST` through *only* when `body.type === "Create"` and the object being created is a `User`/`Person`. This is the shared mechanism behind both `POST /register` and registration-via-`POST /outbox`.

**Failure modes**:
- No `req.user.id` and the route doesn't allow unauth -> `401 { "error": "Unauthorized" }`.
- Uncaught handler error -> `500 { "error": "<message>" }`.
- Default success status is `200` unless the handler calls `setStatus`.

## Pagination & collection responses

Most list endpoints go through `makeCollection()` (`routes/utils/makeCollection.js`), which wraps `route()`:

```js
makeCollection({
  model,
  buildQuery(req, { query, user }) { /* ... */ },
  select,
  sort = { createdAt: -1 },
  sanitize = (doc) => doc,
  basePath(req) { /* ... */ },
  defaultLimit = 20,
  maxLimit = 100,
  routeOpts,
})
```

Query params: `?page=` (default 1, min 1), `?limit=` (default 20, clamped to 1--100).

Response is an ActivityStreams collection via `activityStreamsCollection()` (`routes/utils/oc.js`):

**Root form** (no explicit page requested, or a single-page result):
```json
{
  "@context": "...",
  "type": "OrderedCollection",
  "id": "...",
  "totalItems": 42,
  "first": "...",
  "last": "...",
  "orderedItems": [ ... ]
}
```

**Paginated form**:
```json
{
  "@context": "...",
  "type": "OrderedCollectionPage",
  "id": "...",
  "partOf": "...",
  "orderedItems": [ ... ],
  "totalPages": 5,
  "totalItems": 42,
  "currentPage": 2,
  "next": "...",
  "prev": "..."
}
```

:::note[Two legitimate variants exist alongside the page-based shape]
Not every collection endpoint is page-numbered -- a couple of endpoints are cursor-based by nature, and are intentionally shaped that way rather than forced into `activityStreamsCollection()`'s page-based form:

- **`GET /circles/:id/posts`** -- the primary circle timeline. `{ "@context", type: "OrderedCollectionPage", id, partOf, totalItems, orderedItems, next?, nextCursor? }` -- cursor-based (`?before=`), since a live-updating feed doesn't have stable page numbers. `next` is a full URL embedding the cursor; `nextCursor` is kept alongside it for existing clients that read the raw cursor value directly.
- **`GET /outbox`**'s batch-pull and legacy S2S pull modes (federation-only, not meant for general API consumers) -- already `@context`/`type: "OrderedCollection"`/`totalItems`/`orderedItems`-shaped, but use a `next` cursor (an ISO timestamp for incremental `?since=` pulls) instead of a page URL, and batch-pull mode adds `recipients`/`tombstones` fields specific to the multi-recipient federation-sync protocol it implements. This is a deliberate protocol extension, not a shape bug -- see the Federation docs.

`GET /files` previously returned a bespoke `{ files, total, page, limit, pages }` object; it's now built on `makeCollection()` like every other page-numbered list endpoint and returns the standard shape.

Aside from the two cursor-based cases above, every list endpoint uses the standard `orderedItems` + `totalItems` + `currentPage` shape.
:::

## Rate limiting

In-memory, per-process, per-IP counters (`routes/middleware/rateLimiter.js`) -- **not distributed**, so counts reset per process and don't share state across horizontally-scaled instances. All rate limiting is bypassed entirely if `RATE_LIMITING_ENABLED=false`.

| Limiter | Window | Limit | Applies to |
|---|---|---|---|
| `strictRateLimiter` | 5 min | 20 req | `/auth/*` (except `/auth/me`, `/auth/verify-email`), `/register` |
| `inboxRateLimiter` | 15 min | 100 req | `POST /inbox` |
| `outboxRateLimiter` | 15 min | 200 req | `POST /outbox` |

429 responses include `Retry-After` and `X-RateLimit-*` headers.

### Outbox deduplication (`activityDeduplicator`)

A separate middleware, also on `POST /outbox`: hashes `actorId|type|objectType|to|targetId|content` (SHA-256) and rejects an identical resubmission within **30 seconds** with `409 { "error": "Duplicate activity" }`. The lock is released immediately if the request ultimately errors (status >= 400) -- so a failed-then-corrected resubmit isn't blocked. **`React` activities are exempt** from this check entirely, since React is toggle semantics (rapid react/unreact/react is a legitimate real usage pattern, not a duplicate submit).

This is a different mechanism from the activity-level idempotency keys (`dedupeKey`, `remoteId`) described in the Activities docs -- this one operates purely at the HTTP layer before an activity is ever parsed.

## SPA deep-link guard / content negotiation

A recurring pattern across `posts`, `circles`, `groups`, `pages`, `users`, `servers`, and `admin` routes: when a `GET` request's `Accept` header includes `text/html` (and not `application/activity+json`/`application/ld+json`), the request is deferred to Express's `next('router')` so the built frontend's `index.html` (the SPA) is served instead of a JSON response. The top-level guard in `routes/index.js` applies this to first path segments in `circles, groups, users, posts, pages, profile, search, notifications, servers, discover, admin`. `?rss` in the query string bypasses this guard for feed endpoints.

Several individual route files additionally implement their own local `wantsHTML()` guard doing the same check at finer grain (e.g. per-detail-route rather than per-path-segment).

**Practical implication**: if you're building a non-browser client and getting HTML back instead of JSON, check your `Accept` header -- send `Accept: application/json` (or nothing meaningfully HTML-like) explicitly rather than relying on a browser-default `Accept: text/html,...`.

## The `makeGetById()` helper

Used by several detail routes (`GET /groups/:id`, `GET /bookmarks/:id`, `GET /users/:id`, and others). Calls `Kowloon.get.getObjectById(id, { viewerId, mode, enforceLocalVisibility, canView })`.

**Modes**:
- `local` (default) -- local DB only.
- `remote` -- fetch from the object's origin server only.
- `prefer-local` -- local first, falls back to a remote fetch (and typically caches the result).
- `both` -- checks both, used where local caching of remote objects is expected.

Result is passed through `sanitizeObject`, which audience-gates User personal fields via `getViewerContext` (so, e.g., a private email field is stripped for non-owner viewers automatically).

**Error mapping**:

| Thrown error name | HTTP status |
|---|---|
| `NotAuthorized` | 403 |
| `NotFound` | 404 |
| `BadRequest` | 400 |
| anything else | 500 |

Returns `{ item: <sanitized> }` on success; `404 { "error": "Not found" }` if the lookup comes back empty even without a thrown error.

## Background workers

Not HTTP routes, but started alongside the HTTP server and relevant to understanding system behavior: an outbox federation delivery worker, a poll worker (pulls content from remote servers this server subscribes to), and a nightly garbage-collection worker. See the Federation page for how these interact with `/inbox` and `/outbox`.

## Health checks

`GET /health` is served by the auto-mounted `routes/health` router -- CORS-open (`Access-Control-Allow-Origin: *`, so the install wizard can poll it cross-origin) and returns `503` on a disconnected DB. See [Config, Health, Themes, Push & Recommendations](/docs/api/misc/#health) for the full response shape.

This endpoint used to be defined twice -- a duplicate, shadowed handler in `index.js` plus an unreferenced `/__health` alias alongside it -- with genuine ambiguity about which one actually answered requests. Confirmed by direct testing: the router always won. Both dead handlers were removed; the router above is now the only implementation.

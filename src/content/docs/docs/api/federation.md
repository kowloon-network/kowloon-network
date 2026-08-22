---
title: Federation
description: .well-known discovery, NodeInfo, inbox/outbox delivery, lookup/resolve, server profile, OG, and link preview.
sidebar:
  order: 12
---

The server-to-server plumbing: discovery, activity delivery, and the cross-server object-resolution endpoints. For per-Activity-type processing semantics (what actually happens when a `Follow` or `Create` lands), see the [Activities](/docs/activities/overview/) docs -- this page covers the REST surface only.

## Discovery: `.well-known/*` and NodeInfo

### `GET /.well-known/webfinger?resource=`
Unauthenticated. Only resolves `active` users whose `to === "@public"` -- **private users are never discoverable via WebFinger**, by design. `400` missing `resource`, `404` not found. Returns a JRD document, `Content-Type: application/jrd+json`.

### `GET /.well-known/host-meta`
XRD document pointing at the WebFinger template.

### `GET /.well-known/host-meta/.json`
Same information, JSON form.

### `GET /.well-known/nodeinfo`
Links document pointing at `/nodeinfo/2.0`.

### `GET /nodeinfo/2.0`
Mounted via a relative `"/../nodeinfo/2.0"` trick specifically so it lands **outside** `/.well-known` (per the NodeInfo spec, which expects it at the bare path). NodeInfo 2.0 document:
```json
{
  "version": "2.0",
  "software": { "name": "kowloon", "version": "..." },
  "protocols": ["activitypub"],
  "openRegistrations": true,
  "usage": { "users": { "total": 0 }, "localPosts": 0 },
  "metadata": { "siteTitle": "...", "domain": "..." }
}
```

## Inbox (`POST /inbox` + per-actor aliases)

The server-to-server delivery endpoint. Unauthenticated at the `route()` wrapper level, but actually authenticated via **HTTP Signature verification** (`Kowloon.federation.verifyHttpSignature`) -- this is how a remote server proves it's really the actor it claims to be. Rate-limited via `inboxRateLimiter` (15 min / 100 req -- see [Overview](/docs/api/overview/#rate-limiting)).

**Flow**:
1. Verify the HTTP signature -- normally domain-bound to the sending actor, except group-fanout re-broadcasts, which are verified against the *group's* domain instead.
2. Check the actor/server isn't blocked (`403 "Actor is blocked"` if so).
3. Optionally verify an embedded remote-user Bearer JWT, for proxied user actions.
4. Normalize and idempotently upsert an `Inbox` envelope -- deduped by `remoteId` when present.
5. Respond immediately: `202 { accepted: true }`.
6. Process the activity **asynchronously**, via `Kowloon.activities.create()` inside a `queueMicrotask` -- including group fan-out to remote member servers where applicable.

`401` on a bad signature. `403` on a group-fanout signer/domain mismatch, or a blocked actor.

:::note[This is fire-and-forget from the caller's perspective]
The `202` response only confirms the envelope was accepted for processing, not that the underlying activity succeeded. If you're building federation debugging tooling, you'll need to inspect server-side logs or the `Activity` audit log (`GET /admin/activities`), not the inbox response, to confirm an inbound activity actually applied.
:::

**Aliases**: `POST /users/:id/inbox` and `POST /groups/:id/inbox` -- same handler, mounted per-actor so a specific user or group can be targeted directly by federation delivery.

## Outbox (`/outbox`)

*(REST surface only -- see [Activities](/docs/activities/overview/) for what each activity type actually does once processed.)*

### `GET /outbox`
Three distinct modes, selected by query params:

1. **Batch-pull S2S** (`?from=&to=`) -- the documented federation batch-pull mechanism. `from` can be user handles or bare-server handles; `to` is the requesting server's local users.
   ```json
   {
     "@context": "...",
     "type": "OrderedCollection",
     "id": "...",
     "totalItems": 10,
     "items": [ ... ],
     "recipients": [{ "itemId": "...", "to": "..." }],
     "tombstones": [ ... ],
     "next": "..."
   }
   ```
   `tombstones` (recently-deleted item IDs) is only populated on an incremental pull (`?since=` present).

2. **Legacy S2S pull** (`?from=` only) -- returns raw public `FeedItems` by those authors: `{ ..., orderedItems, next? }` (not the standard collection shape).

3. **Public firehose** (no `?from`) -- unauthenticated, paginated `Activity` log filtered to public-addressed activities, standard `activityStreamsCollection()` shape.

### `POST /outbox`
Rate-limited (`outboxRateLimiter`), deduplicated (`activityDeduplicator`, 30s resubmit lock -- see [Overview](/docs/api/overview/#outbox-deduplication-activitydeduplicator)), and auth-gated: unauthenticated only allowed for `Create` -> `User`/`Person` (registration-via-activity).

Before dispatch, the request is normalized:
- `actorId` is forced to the JWT user (or the server actor, for Create-User).
- Default `to`/`canReply`/`canReact` are injected onto the activity, and -- for every type **except** `Update`/`Delete` -- onto the nested `object` too (those two treat `object` as a patch, not a full record, so defaults would be wrong there).
- Shorthand values expand: `"public"` -> `"@public"`, `"server"` -> `"@<domain>"`.

Delegates to `Kowloon.activities.create()` (or a fallback `#methods/activities/create.js`).

**Success** (`200`):
```json
{
  "ok": true,
  "activity": { ... },
  "result": { ... },
  "createdId": "post:...@...",
  "federate": false,
  "duplicated": true,
  "federationJob": { "jobId": "...", "recipients": 3, "counts": { ... } }
}
```
(`duplicated` and `federationJob` are only present when relevant.)

**Failure**: status is `created.result.status` if the handler set one (e.g. a Reply/React authorization gate returns `404` for a blocked/invisible target vs. `403` for a disabled `canReply`/`canReact`), otherwise `400`.

Full per-activity-type request/response shapes, side effects, and client-library mismatches: see [Activities](/docs/activities/overview/).

## Lookup (`/lookup`)

### `GET /lookup?id=`
Auth required. The **local -> remote** resolver: fetches any object by Kowloon ID -- local, cached, or freshly fetched-and-cached from a remote server (`mode: "prefer-local"`, `hydrateRemoteIntoDB: true`, `maxStaleSeconds: 300`).

`400` missing `id`, `404` not found, plus `403`/`400`/`502`/`500` depending on the specific failure.

This is the inverse of `/resolve` below -- `/lookup` is "give me any object, fetching remotely if needed," `/resolve` is "here's an object *I* own, for someone else to fetch."

## Resolve (`/resolve`)

### `GET /resolve?id=&actorId=`
The outward-facing counterpart to `/lookup`: serves objects **this server owns** to remote requesters. `local`-only -- never fetches remotely itself.

Optional `actorId` param, combined with HTTP Signature verification, identifies the remote requester (falls back to anonymous on verification failure, logged rather than rejected).

- Actor-type objects (`User`/`Person`/`Group`/`Service`/`Application`/`Organization`) are **always** resolvable.
- Non-actor objects go through `canSeeObject` and return **`404`, not `403`**, on denial -- deliberately, to avoid confirming an object's existence to a requester who shouldn't be able to see it.

## Profile (`/profile`)

### `GET /profile`
Always unauthenticated by design -- everything in the response is already `@public`. A one-shot bundle a remote server fetches to populate its own `FederatedServer` cache entry for this server:
```json
{
  "type": "Service",
  "domain": "...", "name": "...", "icon": "...", "image": "...",
  "description": "...", "language": "...", "location": "...",
  "openRegistrations": true, "userCount": 0, "postCount": 0,
  "circles": [ /* top 20 by popularity */ ],
  "groups": [ /* top 20 */ ],
  "pages": [ /* all public */ ]
}
```
Relative asset paths are absolutized against this server's own base URL before being returned.

## OG (`/og/*`)

### `GET /og/image`, `GET /og/icon`
Unauthenticated. Streams the server's profile hero image / icon at a clean, un-encoded URL -- internally rewrites to the same `/files/:id` serving logic. Exists specifically because social-media link-preview scrapers choke on the `file:id@domain`-style path used by `/files/:id`, and need a plain-looking URL. `404` if no image is configured.

## Preview (`/preview`)

### `GET /preview?url=`
Auth required. Server-side link-preview / oEmbed fetcher, built for post composers.

**SSRF-guarded**: `isSafeUrl` rejects loopback/private/link-local targets before any fetch is attempted (mitigates GHSA-4gp8-rjrq-ch6q). `400` if `url` is missing, `400` if `isSafeUrl` rejects it.

- **Local Kowloon URLs** (own domain, matching `/posts/`, `/pages/`, or a generic Kowloon-object URL pattern for Post/Group/Circle/Bookmark/User) are resolved **directly from the DB**, not scraped.
- **YouTube** gets real title/thumbnail via its oEmbed endpoint, bypassing YouTube's generic OG metadata.
- Bot-protection interstitials (Cloudflare, PerimeterX, etc.) are detected via a title/description regex and suppressed in favor of a clean URL-derived fallback title, so composers don't show a "please enable JavaScript" preview.
- Recognized Kowloon links passively grow the `FederatedServer` discovery cache for the linked domain.

Response:
```json
{
  "url": "...", "title": "...", "summary": "...", "image": "...", "favicon": "...",
  "contentType": "...", "provider": "...", "queryTime": 123,
  "kowloonId": "post:...@...", "kowloonType": "Post"
}
```
`kowloonId`/`kowloonType` are only present for recognized Kowloon links -- a client can use these to store the canonical target ID on a Link post rather than just the raw URL.

---
title: Circles
description: /circles/* — circle detail, membership, and circle-scoped timelines.
sidebar:
  order: 3
---

### `GET /circles`
Unauthenticated OK (`allowUnauth: true` explicit). Local circles only — excludes cached remote circles (filtered via `originDomain`).

**Visibility**: unauthenticated or remote viewer → `@public` only; local authenticated → `@public` + `@server`.

`?sort=reacts` sorts by `reactCount` descending; default sort is `createdAt` descending. Response items are annotated with `userReacted: boolean` for the authenticated viewer.

### `GET /circles/:id`
Circle detail with tiered access: `@public` → anyone; `@<domain>` → any local authenticated user; circle-addressed (private) → owner or member only.

:::caution[Admin/mod circles are masked, not just restricted]
If the requested circle is the server's configured `adminCircle` or `modCircle` (the internal admin/mod rosters), this returns **404** for any non-owner/non-admin viewer — even though those circles are technically server-tier and would otherwise be visible to any local authenticated user. This is deliberate: it hides the *existence* of the admin/mod roster from ordinary users, not just its contents.
:::

`401` if unauthenticated and the circle isn't public; `403` if authenticated but denied. Response includes `isOwner` / `isMember` flags for client UI gating.

### `GET /circles/:id/posts`
The primary circle-based timeline. Same tiered access as circle detail (owner / member / public / server), but **`401` if fully unauthenticated regardless of tier** — even a public circle's posts require auth to view via this endpoint.

Delegates to `methods/feed/getTimeline.js`. Query params: `?types=` (comma-list), `?before=` (cursor), `?limit=` (max 500).

:::caution[Non-standard response shape]
This does **not** go through `activityStreamsCollection()`. It returns a raw object:
```json
{
  "@context": "...",
  "type": "OrderedCollectionPage",
  "totalItems": 120,
  "orderedItems": [ ... ],
  "nextCursor": "..."
}
```
Cursor-based (`nextCursor` / `?before=`), not page-numbered like most other list endpoints. Items are normalized feed entries with `attributedTo`, `visibility`, and resolved image/attachment URLs.
:::

### `PATCH /circles/:id/seen`
Owner only (`403` otherwise, `401` unauthenticated, `404` not found). Body:
```json
{ "lastSeenAt": "2026-08-13T12:00:00.000Z" }
```
Advances (never rewinds) the circle's read high-water mark. `400` on an invalid date.

### `GET /circles/:id/members`
Paginated member list, same tiered visibility as circle detail. `401` / `403` / `404` accordingly.

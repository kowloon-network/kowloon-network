---
title: Posts
description: /posts/* — the public post firehose, per-post detail, replies, and reactions.
sidebar:
  order: 2
---

`POST /outbox` (with `type: "Create", objectType: "Post"`) is how posts are created — see the [Activities](/docs/activities/overview/) docs for the write path. This page covers the read-side REST surface.

### `GET /posts`
Unauthenticated OK. Public firehose sourced from the `FeedItems` cache (not the `Post` collection directly), scoped to the viewer's **own server only** by `originDomain` — posts pulled into a Circle from elsewhere via federation don't leak into this Community feed.

**Visibility tiers**:
- Unauthenticated or remote viewer → `@public` only.
- Authenticated local user → `@public` + `@server` merged by default, or pin one tier explicitly via `?to=public` / `?to=server` (`server` tier is `403` for non-local users).

**Query params**: `?type=` (comma-separated post types), `?since=` (ISO date), `?serverId=`, `?page=`, `?limit=`, `?rss` (returns RSS/XML, `Content-Type: text/xml`, instead of JSON).

Blocked/muted actors and servers are excluded automatically. Response items are `feedItemToPost()`-shaped: `featuredImage`/`attachments` are resolved to proxy URLs (`/files/:id`, signed if the file is restricted), plus a `myReact` field for the viewer.

### `GET /posts/server`
Auth required, **local users only** (`401` unauthenticated, `403` non-local). Server-tier-only posts, kept as an explicit endpoint even though `GET /posts` now merges public+server by default. Same query params as above, minus `?to`.

### `GET /posts/:id`
Post detail. Resolved via `FeedItems`, run through `canView`/`enrichWithCapabilities` (viewer-scoped visibility including FeedFanOut resolution for circle-addressed posts).

| Status | Meaning |
|---|---|
| 401 | unauthenticated and not visible |
| 403 | authenticated but denied |
| 404 | not found, deleted, or tombstoned |

Response merges the sanitized object with `canReply`, `canReact`, `publishedAt`, `updatedAt`, `visibility` (`Public` / `Server` / `Audience`), resolved `featuredImage`/`attachments`, `myReact`, and `reactCounts` (`{ emoji, count }[]`, aggregated live).

If the viewer is the post's author, raw editable fields are also included: `source`, `title`, `href`, `to`, `tags`, `location`, `event`.

Browser navigations (`Accept: text/html`) defer to the SPA — see [Overview: SPA deep-link guard](/docs/api/overview/#spa-deep-link-guard--content-negotiation).

### `GET /posts/:id/replies`
Paginated (`?page`, `?limit`).

:::caution[Local vs. remote posts behave differently]
For a **local** post, this queries the local `Reply` collection directly (`{ target, deletedAt: null }`, blocked/muted excluded).

For a **remote** post, this transparently **proxies** the request to the post's home server (`https://<remoteDomain>/posts/:id/replies`) instead — replies are only canonical at the parent post's origin server, and no local reply cache is kept for remote posts. Don't assume a fast local response; a remote post's replies incur an outbound HTTP call.
:::

### `GET /posts/:id/reacts`
`makeCollection` over the `React` model, filtered by `target`, blocked/muted excluded. Standard `OrderedCollection`/`OrderedCollectionPage` shape — see [Overview](/docs/api/overview/#pagination--collection-responses).

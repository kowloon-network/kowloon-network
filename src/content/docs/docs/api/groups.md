---
title: Groups
description: /groups/* -- group listing, membership, pending requests, and group-scoped posts.
sidebar:
  order: 4
---

### `GET /groups`
`makeCollection`. **Visibility**: unauthenticated or remote viewer -> `@public`; local authenticated -> `@public` + `@<domain>` + any circle-scoped (private) groups the viewer is a member of, resolved via `getViewerContext`.

### `GET /groups/:id`
Via the shared [`makeGetById()`](/docs/api/overview/#the-makegetbyid-helper) helper (`mode: "local"`). Browser navigations defer to the SPA.

### `GET /groups/:id/members`
Visibility gated on the group's `to` field across all three tiers (`canSeeObject`). Resolves the group's `circles.members` Circle.

```json
{ "members": [{ "id": "...", "name": "...", "icon": "...", "url": "..." }], "totalItems": 12 }
```

### `GET /groups/:id/pending`
Admin-of-group only -- the requester must be in `group.circles.admins` (`403` otherwise).

```json
{ "pending": [ ... ], "totalItems": 3 }
```
Sourced from `group.circles.pending`.

### `GET /groups/:id/posts`
Access mirrors group visibility: public / server / member-of-`circles.members`. Query params: `?type=`, `?since=`, `?page=`, `?limit=`, `?rss` (group-scoped RSS). Backed by `FeedItems` filtered on `group: <id>`.

### `POST /groups/:id/inbox`
Server-to-server: remote servers deliver activities addressed to this group here. Reuses the generic inbox handler -- see [Federation](/docs/api/federation/#inbox-post-inbox--per-actor-aliases).

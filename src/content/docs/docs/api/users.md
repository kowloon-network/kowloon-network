---
title: Users
description: /users/* -- profiles, directory search, per-user content, circles, groups, bookmarks, activities, and notifications.
sidebar:
  order: 7
---

## ID handling

A bare `:id` segment (no `@`) on a `GET` request is auto-expanded to `@<val>@<domain>` -- so clients can call `/users/alice` instead of the full `@alice@domain`. The static segments `lookup` and `search` are exempted from this expansion (they're reserved route names, not user IDs).

## Content negotiation on `GET /users/:id`

- `Accept: application/activity+json` (or an AS-profile `Accept`) -> serves a full ActivityPub actor document (`actor.js`) -- includes `publicKey`, `inbox`, `outbox`, etc. -- `Content-Type: application/activity+json`.
- `Accept: text/html` -> defers to the SPA.
- Otherwise -> normal sanitized JSON via [`makeGetById()`](/docs/api/overview/#the-makegetbyid-helper).

### `GET /users`
Public directory listing, `active: true` only. Personal fields are gated per-viewer via `sanitizeObject`.

### `GET /users/search?q=`
Three modes depending on the shape of `q`:

| Query shape | Behavior |
|---|---|
| `@user@domain` | Local DB lookup, or transparent proxy to the remote server if not local |
| `@domain` | Top-20 public users on that server by `postCount`, local or proxied |
| plain text / local `@handle` | **Auth required.** Regex search on `username`/`profile.name` |

`400` if `q` is missing. `401` for a plain-text search while unauthenticated.

### `GET /users/:id`
Profile detail -- see content negotiation above. Sanitized per-viewer (audience-gated personal fields).

### `GET /users/:id/posts`
Visibility depends on the viewer's relationship to the profile owner:

| Viewer | Sees |
|---|---|
| the owner themself | public + server + audience (their own circle-addressed posts) |
| unauthenticated | public only |
| local authenticated, not owner | public + server |
| remote | public only |

Query params: `?type=`, `?since=`, `?sort=top` (ranks by `reactCount`), `?page=`, `?limit=`, `?rss`.

### `GET /users/:id/circles`
Owner sees **all** their own circles. Others see `@public` circles (plus `@<domain>`-tier ones if same-server and authenticated).

Owner-only `?contains=<memberId>` annotates each returned circle with `contains: boolean` -- pre-marks "already a member" state for an add-to-circle UI, so the client doesn't need a separate lookup per circle.

### `GET /users/:id/groups`
Membership source is the user's `circles.groups` system circle. Owner sees all their memberships; others see only groups visible to them (same tiering as [`GET /groups`](/docs/api/groups/#get-groups)).

### `GET /users/:id/bookmarks`
Owner sees everything -- flat by default, or scoped to a folder via `?parentFolder=<id>`. Non-owners get root-only, or a specific folder's children **with full ancestor-chain visibility verification** -- `404` (not `403`) if the chain isn't visible, so existence isn't confirmed to a viewer who shouldn't see it.

### `GET /users/:id/activities`
`makeCollection` over the `Activity` audit log, filtered to `actorId = :id`.

## Notifications sub-router (`/users/:id/notifications/*`)

Mounted, **owner-only** (`ownerOnly` guard -- `401` unauthenticated, `403` if `params.id !== user.id`). Same route set as the standalone [`/notifications`](/docs/api/notifications/) alias, just path-addressed instead of self-resolved from the JWT:

- `GET /` -- paginated, `?types=`, `?unread=true`
- `GET /unread/count` -- `{ count }`
- `POST /:notifId/read`
- `POST /:notifId/unread`
- `POST /read-all` (`?types=`)
- `POST /:notifId/dismiss`

### `POST /users/:id/inbox`
Server-to-server per-user inbox delivery. Same handler as [`POST /inbox`](/docs/api/federation/#inbox-post-inbox--per-actor-aliases), mounted per-user for federation targeting a specific actor.

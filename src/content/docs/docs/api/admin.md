---
title: Admin
description: /admin/* -- server administration, moderation, settings, backups, and diagnostics.
sidebar:
  order: 14
---

Every route under `/admin/*` is gated by a server-admin auth check.

## Auth guard

Separate from the standard [`route()` wrapper's auth](/docs/api/overview/#auth-the-route-wrapper) -- `routes/admin/index.js` implements its own middleware:

1. Requires `Authorization: Bearer <jwt>` or `Authorization: Token <jwt>`.
2. Verifies RS256 against `settings.publicKey`, issuer `https://<domain>`.
3. Calls `isServerAdmin(userId)`.

| Status | Meaning |
|---|---|
| 401 | missing or invalid token |
| 403 | valid token, but the user isn't a server admin |

**Browser-navigation guard**: if the frontend is enabled and the request has no `Authorization` header and prefers `html`, it's deferred to the SPA instead of returning JSON -- same pattern as elsewhere, see [Overview](/docs/api/overview/#spa-deep-link-guard--content-negotiation).

## The shared CRUD shape

Most admin resource groups (`users`, `posts`, `circles`, `groups`, `pages`, `recommendations`, `sections`) follow the same pattern:

- `GET /` -- list. Admin can see soft-deleted items via `?deleted=true`, or both deleted and live via `?deleted=include`. Usually `makeCollection`, sometimes manual.
- `GET /:id` -- detail.
- `POST /` -- create (for content types, always server-owned).
- `PATCH /:id` -- update.
- `DELETE /:id` -- soft-delete by default. **`?fullDelete=true` hard-deletes.**
- `POST /:id/restore` -- un-delete a soft-deleted item.

Only the meaningful differences per group are called out below -- assume the shape above unless noted otherwise.

## `/admin/users`
`GET /`, `GET /:id` only -- no create/update, since users self-register. `DELETE /:id` soft-deletes (`deletedAt`, `active: false`), or hard-deletes with `?fullDelete=true`. `POST /:id/restore` reactivates.

## `/admin/posts`
Create/update are scoped to **server-owned announcement posts only**.

:::caution[Ownership check on PATCH]
`PATCH /admin/posts/:id` returns **`403`** if the post's `actorId` isn't the server actor -- you cannot edit a regular user's post via the admin API, even as a server admin. Create requires `source.content` or `title`.
:::

`?visibility=all` on the list includes circle-addressed (private) posts -- the default list only shows `@public`/`@server` posts.

## `/admin/circles`
Same server-owned-only edit restriction as posts. `?server=true` filters the list to server-owned circles; `?type=` overrides the default `type: "Circle"` filter.

## `/admin/groups`
Same server-owned-only edit restriction as posts. `?rsvpPolicy=` filter on the list.

## `/admin/pages`

:::caution[No ownership check -- inconsistent with posts/circles/groups]
Unlike posts, circles, and groups, `PATCH /admin/pages/:id` has **no `actorId` ownership check at all** -- any server admin can edit any page regardless of who created it. `:id` accepts either an id or a slug. This is a real inconsistency versus the other three content types, not a documentation omission -- verify against source if you're relying on admin-edit permissions being uniform across content types.
:::

## `/admin/flagged`
The moderation queue over the `Flag` model.

- `GET /` -- `?status=` (default `"open"`), `?targetType=`, `?actorId=`
- `GET /:id`
- `PATCH /:id` -- body `{ "status": "resolved" | "dismissed", "notes": "..." }`

No create/delete here -- flags are user-generated via `POST /outbox { type: "Flag" }` (see [Activities](/docs/activities/overview/)), out of scope for this admin router.

## `/admin/invites`
Mounted as flat routes directly on `routes/admin/index.js` itself, not a sub-router:

- `POST /invites` -- body:
  ```json
  { "type": "individual", "email": "...", "maxRedemptions": 1, "expiresAt": "...", "note": "...", "welcomeMessage": "..." }
  ```
  (`email` required for `type: "individual"`.) Individual invites trigger an email send -- best-effort, a failure is logged but not fatal to the request.
- `GET /invites`
- `GET /invites/:id`
- `DELETE /invites/:id` -- **deactivates** (soft), doesn't remove the row.

## `/admin/settings`
- `GET /` -- lists all Settings docs. Values are redacted to `"[redacted]"` for `to: "@private"` settings or the specific `name: "privateKey"` setting.
- `PATCH /` -- bulk update. Body is the settings object **directly**, not wrapped: `{ "settingName": value, ... }`. Any key whose doc has `canEdit: "@private"` or `ui.type: "redacted"` is rejected **wholesale** -- the entire request fails with `403` listing the blocked keys, not a partial-success.
- `PATCH /:name` -- single-setting update, body `{ "value": ... }`.

Two special-cased behaviors:
- The `rules` setting is normalized through `normalizeRules` on write.
- Settings named in `HTML_FIELDS_BY_SETTING` (currently just `profile.description`) get HTML-sanitized on write.

## `/admin/system`

A genuine grab-bag -- several unrelated concerns share this router:

**Diagnostics** -- `GET /` returns:
```json
{
  "db": { /* db.stats() */ },
  "counts": { "users": 0, "posts": 0, "groups": 0, "circles": 0, "pages": 0, "replies": 0, "reacts": 0, "activities": 0, "openFlags": 0, "activeInvites": 0 },
  "disk": { /* statfs on cwd, best-effort */ },
  "process": { /* node/process/memory stats */ }
}
```

**Admin/mod membership** -- also on this router, despite not really being "system" diagnostics:
- `GET/POST /system/admins`, `DELETE /system/admins/:userId`
- `GET/POST /system/mods`, `DELETE /system/mods/:userId`

These manage the server's admin/mod circles **directly** -- deliberately bypassing the normal ActivityPub `Add`/`Remove` activity pipeline, since these circles are server-owned rather than user-owned and don't need federation/audit-trail semantics applied.

**Logs** -- `GET /system/logs?tail=&level=` -- tails the app log file, capped at 2000 lines.

:::note[Sync backup removed]
`GET /system/backup` -- a synchronous full-DB JSON export that blocked the request until the entire database was serialized in memory -- has been removed in favor of the async job queue below, which also archives S3-stored files (not just Mongo documents) and doesn't block the event loop.
:::

## `/admin/backup`
Async backup/restore job queue, backed by `BackupJob` plus S3/MinIO archive storage. Requires a separate worker process (`workers/backup.js`) to actually run jobs -- see the note below.

- `POST /` -- queues a backup job. `409` if one's already running.
- `GET /` -- lists the last 20 jobs.
- `GET /:id` -- job status.
- `GET /:id/download` -- streams the completed archive. `409` if `status !== "done"`.
- `DELETE /:id` -- deletes the job record and its S3 archive.
- `POST /restore` -- `multipart/form-data`, field `archive`, up to 512MB. Uploads to a temp S3 key and queues a restore job. `409` if a job is already in flight, `400` if no file was sent.

:::note[Requires a running worker]
Queuing a job here (`POST /` or `POST /restore`) only creates a `pending` `BackupJob` document -- a separate long-running process, `workers/backup.js`, polls for pending jobs and actually runs them (`mongodump`/`mongorestore` + file download/upload to S3). If that worker isn't running, jobs sit in `pending` forever and never complete. Verified end-to-end (2026-08-21): a queued backup job correctly dumps the database, downloads every file from S3, packages a `.tar.gz`, uploads it back to S3, and is downloadable via `GET /:id/download`.
:::

## `/admin/activities`
`GET /` only -- `makeCollection` over the raw `Activity` audit log. `?type=`, `?actorId=`, `?objectType=`.

## `/admin/recommendations` + `/admin/sections`
The curation CRUD backing the public [Discover feed](/docs/api/misc/#recommendations-recommendations).

`/admin/recommendations`:
- `POST /` -- body `{ "ref": "...", "section": "...", "note": "...", "order": 0 }`.
  - Validates `ref` resolves to a curatable type: `Post | Circle | Group | Bookmark | Page`.
  - **Users cannot be recommended** -- `400` if you try.
  - Validates the target exists and isn't private-tier -- `400` if private.
  - Snapshots the target's tier into `visibility` at add-time -- but note (per the public endpoint's docs) the *live* target is still what's checked at read time; this snapshot isn't used for enforcement, just bookkeeping.
- `PATCH /:id` -- allows `note`, `order`, `active`, `section`.

`/admin/sections`:
- CRUD for the Discover shelves themselves: `name`, `summary`, `order`, `to`, `active`.
- `DELETE /:id?fullDelete=true` -- cascade-deletes that section's recommendations too, not just the section row.

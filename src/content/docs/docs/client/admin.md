---
title: AdminClient
description: The server-admin CRUD surface — 35+ methods across users, content, moderation, settings, and backups.
sidebar:
  order: 9
---

`client.admin` (also available via the `@kowloon/client/admin` subpath export) wraps the server's `/admin/*` routes. Every method here requires the logged-in user to be a server admin or moderator — see the [REST API admin docs](/docs/api/admin/) for the exact auth guard and per-route detail. This page covers the client-side method surface.

## The standard CRUD pattern

Most content types follow the same five-method shape:

```js
client.admin.get<Plural>(options)      // list — page/since/showDeleted/type
client.admin.get<Singular>(id)
client.admin.create<Singular>(data)    // where applicable
client.admin.update<Singular>(id, updates)   // raw PATCH — bypasses the outbox/Activity pipeline entirely
client.admin.delete<Singular>({ id, fullDelete })  // soft-delete by default; fullDelete: true hard-deletes
client.admin.restore<Singular>(id)     // undo a soft-delete
```

This pattern covers: **Activities, Users, Circles, Groups, Posts, Bookmarks, Pages**. List methods share an internal `_listParams` helper that normalizes `page`/`since`/`showDeleted` (→ `deleted=true` server-side)/`type`.

:::note
`update<Singular>` here is a **raw `PATCH`**, not an Activity — it does not go through `POST /outbox` or get an `Activity` audit-log entry the way [`client.activities.updatePost`](/docs/client/activities/) etc. do. This is a real, intentional difference between the admin surface and the normal write path, not an oversight.
:::

## Discover admin

```js
client.admin.getSections()
client.admin.createSection(data)
client.admin.updateSection(id, updates)
client.admin.deleteSection(id)

client.admin.getRecommendations()
client.admin.addRecommendation(data)
client.admin.updateRecommendation(id, updates)
client.admin.removeRecommendation(id)
```

Curation CRUD for the public Discover feed's shelves and items — see [`GET /recommendations`](/docs/api/misc/) for how these surface to end users.

## Invites

```js
client.admin.createInvite({ email, maxRedemptions, expiresAt, note, welcomeMessage })
```

:::danger[Field-name footgun]
The field names must be exactly `email` and `maxRedemptions`. A code comment in the client warns that a prior version of this call used `recipient`/`amount` — the server silently ignored those unrecognized fields rather than erroring, so the bug shipped invites with no email recipient and no redemption cap without any visible failure. Double-check these exact field names if you're calling this directly rather than through whatever UI already wires it up correctly.
:::

## Moderation

```js
client.admin.getFlagged({ status, targetType, actorId })
client.admin.getFlag(id)
client.admin.resolveFlag(id, { status, notes })   // status: 'resolved' | 'dismissed'
```

## Settings

```js
client.admin.getSettings()
client.admin.getSetting(name)
client.admin.updateSetting(name, value)
client.admin.deleteSetting(name)
```

Settings marked `canEdit: '@private'` or with a redacted UI type are rejected by the server even through these calls — see the [REST API admin docs](/docs/api/admin/) for the exact redaction rules.

## Server management

```js
client.admin.restartServer()
client.admin.serverStats()          // GET /admin/system
client.admin.getAdmins()
client.admin.addAdmin(userId)
client.admin.removeAdmin(userId)
client.admin.getMods()
client.admin.addMod(userId)
client.admin.removeMod(userId)
client.admin.getLogs({ tail, level })   // tail defaults to 200, level defaults to 'all'
```

Admin/mod membership here bypasses the normal Add/Remove Activity pipeline — these circles are server-owned, and this is a direct membership-management path, not a client wrapper around `client.activities.addToCircle`.

## Backup and restore

```js
client.admin.createBackup()
client.admin.listBackups()
client.admin.getBackupJob(id)
client.admin.deleteBackup(id)
client.admin.backupDownloadUrl(id)     // pure URL builder, not an HTTP call
client.admin.restoreFromFile(file)     // raw multipart fetch — bypasses HttpClient, same as FilesClient.upload()
```

These back an async job queue server-side (queue a backup, poll for status, download when done) rather than a synchronous export. `restoreFromFile` and `backupDownloadUrl` share the same multipart/raw-fetch caveat as `FilesClient.upload()` — see the [gotchas page](/docs/client/gotchas/).

## Search

```js
client.admin.adminSearch({ query, showDeleted })
```

Mirrors `client.search.search()`, but hits `/admin/search` and can include soft-deleted content in results.

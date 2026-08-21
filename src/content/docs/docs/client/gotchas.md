---
title: Client Library Gotchas
description: Every known convention break, bug, and correction in @kowloon/client, collected in one place.
sidebar:
  order: 99
---

A single, scannable list of the real inconsistencies and bugs found while researching this library — the kind of thing you want to remember exists rather than rediscover by debugging. Each one is confirmed against the actual source, not inferred.

:::caution[Bare-string-id methods break the options-object convention]
Almost everything in this library takes a single options object (`{ postId, content }`, not positional args). A handful of methods don't:

- `FilesClient.getMeta(fileId)` and `FilesClient.delete(fileId)`
- `NotificationsClient.markRead(id)`, `markUnread(id)`, `dismiss(id)`

All four take a bare string. Everything else on those same sub-clients (`FilesClient.list()`, `NotificationsClient.list()`/`unreadCount()`/`markAllRead()`) takes an options object as usual. Check the exact signature before assuming uniformity.
:::

:::caution[Multipart calls bypass HttpClient and its error normalization]
`FilesClient.upload()`, `AdminClient.restoreFromFile()`, and `AdminClient.backupDownloadUrl()` skip `HttpClient` and either build a raw `fetch()` multipart request or just build a URL directly — `HttpClient` always JSON-stringifies its request body, which doesn't work for `FormData`. A practical consequence: errors from an upload or restore call are **not guaranteed to arrive as a `KowloonError` subclass** the way errors from every other method are. If you're writing generic error-handling that pattern-matches on the `KowloonError` hierarchy, add a plain-`Error` fallback specifically around these calls.
:::

:::danger[`updatePost`'s `content` field is remapped, not passed through]
`client.activities.updatePost({ postId, updates: { content } })` does **not** send `content` at `object.content`. It's remapped to `object.source = { content }`, matching where the server's `Update` handler for Posts actually expects content patches. Similarly, `to`/`canReply`/`canReact` patch values are nested inside `object`, not sent at the activity's top level. Get this wrong and the update silently no-ops on the field you meant to change rather than erroring.
:::

:::danger[`deleteReact()` is confirmed broken]
`client.activities.deleteReact({ reactId })` sends `{ type: 'Undo', objectType: 'React', target: reactId }`. The server's `Undo` handler requires a full `object` — the original activity being undone — and has no code path that reads a bare `target` id at all. This call will always fail server-side validation with a missing-object error. **The working way to clear a reaction is `client.activities.react({ postId, emoji: '' })`** — an empty-string emoji is the server's actual "clear my reaction" signal. See the [Activities gotchas page](/docs/activities/gotchas/) for the server-side confirmation.
:::

:::danger[`rejectJoinRequest()` sends a nonexistent Activity type]
`client.activities.rejectJoinRequest({ groupId, userId })` sends `{ type: 'Reject', ... }`. `"Reject"` isn't a recognized Activity type anywhere on the server — it's not in the envelope schema's `type` enum, and there's no `Reject` handler. This call always fails. There is currently no working client method for rejecting a pending group join request.
:::

:::caution[`createInvite` has an exact field-name requirement]
`client.admin.createInvite({ email, maxRedemptions, ... })` — a code comment in the client itself warns that an earlier version used `recipient`/`amount` instead, which the server silently dropped (unrecognized fields, no error), shipping invites with no recipient email and no redemption cap. Use `email`/`maxRedemptions` exactly.
:::

:::note[The client's own CLAUDE.md is stale]
The internal `client/CLAUDE.md` module list omits `embeds/`, `moderation/`, `prefs/manifest.js`, `prefs/pins.js`, and `themes/` entirely — all five are real, first-class modules with their own doc pages here. It also states admin is "a separate package export only," which is incomplete: `client.admin` is wired onto every normal `KowloonClient` instance too, in addition to being reachable via the `@kowloon/client/admin` subpath export. Both access paths work; treat this documentation site, not that file, as current.
:::

## Related

- [Activities gotchas](/docs/activities/gotchas/) — server-side Activity-type bugs and dead code (Upload being unreachable, the parallel Follow/Unfollow federation layer, etc.) that these client-side issues connect to.

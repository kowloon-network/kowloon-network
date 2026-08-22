---
title: ModerationClient
description: Client-side block/mute filtering for content fetched anonymously from other servers.
sidebar:
  order: 6
---

## Why this exists

The server enforces your block and mute lists for any request it serves to *you*, authenticated. But some content in the app is fetched a different way: **anonymously, directly from a remote server** -- previewing another server's public firehose, browsing its `/recommendations`, that kind of thing. In that scenario, the remote server has no idea who's asking, so it can't apply your personal block list on your behalf. And your home server's JWT can't help either -- Kowloon signs tokens per-server (RS256, keyed to that server's own public key), so a token issued by your home server can't even be verified by a different server you're browsing anonymously.

`ModerationClient` is how those anonymous, cross-server views still respect your own blocked/muted list -- by filtering client-side, after the fact, using a set the client fetched from your *own* server while you were authenticated there.

## `load(options)`

```js
await client.moderation.load({ force })
```

Fetches the logged-in user's `blocked` and `muted` circles once, splitting members into two sets: individual actor ids, and whole-domain entries (a bare `@domain` block/mute). The result is cached; concurrent callers awaiting `load()` before it resolves share the same in-flight request rather than triggering duplicate fetches. Pass `force: true` to bypass the cache and refetch. If the user isn't logged in, or the circle fetch errors, `load()` fails open -- you get empty sets rather than a thrown error, so a moderation-loading failure never blocks the content from rendering.

## `invalidate()`

```js
client.moderation.invalidate()
```

Drops the cached sets so the next `load()` refetches. `ActivitiesClient` calls this automatically after `block`/`unblock`/`mute`/`unmute`, and after `addToCircle`/`removeFromCircle` calls that touch the blocked/muted circles -- you generally don't need to call it yourself unless you're bypassing those methods.

## `isExcluded(actorId)`

```js
client.moderation.isExcluded(actorId) // sync
```

A synchronous check against the cached sets (covers both direct actor blocks/mutes and whole-domain ones).

:::caution
`isExcluded` fails open to `false` if `load()` hasn't run yet -- an un-primed cache doesn't exclude anything. Call `load()` before relying on `isExcluded`/`filterItems` to actually filter.
:::

## `filterItems(items, options)`

```js
client.moderation.filterItems(items, { getActorId })
```

A synchronous array filter for feed-shaped items. By default it extracts an actor id from each item via `item.actorId ?? item.actor?.id ?? item.attributedTo?.id`; pass `getActorId` to override the extraction for a different item shape.

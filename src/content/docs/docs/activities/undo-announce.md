---
title: Undo & Announce
description: The two remaining inbound-only, federation-triggered activity types.
sidebar:
  order: 9
---

Both of these are inbound-only -- no client SDK method sends either. They only ever arrive from a remote server's federation traffic.

## Undo

Handles **inbound federated** undo semantics -- the generic ActivityPub-style undo. `activity.object` must be the full original activity being undone (an object, not just an ID):

```json
{
  "type": "Undo",
  "actorId": "https://remote.example/users/bob",
  "object": { "type": "React", "to": "post:64f0...@kwln.org" }
}
```

**Required**: `actorId`, `object` (must be present/truthy -- there's no shape check beyond that).

Only one case is implemented: `object.type === "React"` or `"Like"` -- a remote actor removed their reaction. Deletes the remote actor's React record for the target and recomputes react counts via the same recompute logic [React](/docs/activities/react/) uses.

Anything else -- including `Undo{Follow}`, which a remote server could still send even though Kowloon no longer creates follow relationships that way -- is acknowledged and logged, but no action is taken (`status: "ignored"`).

**Response**: `{ activity, result: { status }, federation: { shouldFederate: false } }` always -- `Undo` never re-federates.

## Announce

A remote actor boosted/reshared one of our posts, or a third-party post.

```json
{
  "type": "Announce",
  "actorId": "https://remote.example/users/bob",
  "object": "https://kwln.org/posts/64f0..."
}
```

**Required**: `actorId`, `object` (a string URL or `{ id }`). If the announced object resolves to a local Post, increments its `shareCount` (both the Post doc and its `FeedItems` cache entry). Always upserts a synthetic `FeedItems` row of `type: "Announce"` (id `activity.remoteId`, or a generated `announce:<actorId>:<timestamp>` fallback) so the boost shows up in the announcer's followers' timelines.

**Response**: `{ activity, result: { status: "announced", announcedObjectId }, federation: { shouldFederate: false } }`.

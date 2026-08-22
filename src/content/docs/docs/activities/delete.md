---
title: Delete
description: Soft-delete a Post, Circle, Group, Page, Bookmark, Reply, React, or User.
sidebar:
  order: 4
---

`Delete` removes an object. Like `Update`, dispatch is purely by parsing the `target` ID's prefix -- there's no dependency on `objectType` at all.

```json
{ "type": "Delete", "target": "post:64f0...@kwln.org" }
```

**Required**: `actorId`, `target` (a string, or a non-empty array of strings -- see [Batch delete](#batch-delete)).

## Soft delete

Deletion is soft. It sets `{ deletedAt, deletedBy, type: "Tombstone" }` -- or, for `User` targets, `{ deletedAt, deletedBy, active: false }` (no `Tombstone` type, since Users don't have a `type` field like that).

:::caution[System Circles cannot be deleted]
System Circles (`type: "System"`) cannot be deleted at all, even by an admin. Per a comment in the handler itself, this is "not a permission, a structural invariant" -- other code dereferences `user.circles.*` assuming they always resolve to a real Circle.
:::

## Batch delete

`target` can be an array of IDs, each processed independently, with partial failures reported:

```json
{ "type": "Delete", "target": ["post:aaa@kwln.org", "post:bbb@kwln.org"] }
```

## Auth

Owner (`current.actorId`, or `current.id` for `User` targets) or a server admin.

## Side effects

- Purges the corresponding `FeedItems` row.
- **Bookmark `Folder` deletion cascades**: recursively soft-deletes every descendant Bookmark/Folder the same owner owns (a BFS walk over `parentFolder`), only on the first tombstone -- repeat deletes don't re-cascade.
- Decrements `User.postCount`/`.replyCount`/`.reactCount` on first tombstone only (guarded so repeat `Delete` calls on an already-tombstoned object don't double-decrement).
- Reply deletion also decrements the root post's `replyCount` -- the mirror of Reply's create-time bump.

## Response

Single target: `{ activity, created: <tombstoned doc>, result: same, federation }` (kept for backwards compatibility with the single-target shape). Multiple targets: `{ activity, results: [...tombstoned docs], errors: [...failures]?, federation }`.

## Client mapping

`deletePost`, `deleteReply`, `deleteCircle`, `deleteGroup`, `deleteBookmark`, `deletePage` all match -- single-target only. Batch delete has no client SDK wrapper currently.

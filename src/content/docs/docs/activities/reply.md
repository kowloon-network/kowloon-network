---
title: Reply
description: Two-level threaded replies to Posts and other Replies.
sidebar:
  order: 5
---

`Reply` is not a Post subtype -- it's a separate Mongoose model with its own self-contained handler. It does not delegate to `Create`; this is a deliberate architecture decision, not an oversight.

```json
{
  "type": "Reply",
  "objectType": "Reply",
  "to": "post:64f0...@kwln.org",
  "object": {
    "type": "Reply",
    "source": { "content": "Nice post!", "mediaType": "text/markdown" }
  }
}
```

A bare `object.content` string is also accepted as a fallback to `object.source.content`.

**Required**: `actorId`, `objectType === "Reply"`, `object` (an object), `to` (the ID of whatever is being replied to -- a Post **or** another Reply).

## Threading model

Threading is capped at two levels, Facebook-style. `to` is resolved server-side into:

- **`target`** -- the root Post (always the top-level Post, so `GET /posts/:id/replies` can return the entire thread in one query, and federation can route to the post's host).
- **`parent`** -- the immediate parent, but never deeper than a first-level reply. A reply to a second-level reply flattens onto its level-1 ancestor.

`Reply.to`, `.canReply`, and `.canReact` on the created document are **always blank strings** -- visibility is entirely inherited from the root post. These fields exist only for possible future-proofing; don't rely on them being populated.

## Auth

`authorizeInteraction({ actorId, targetId: rootId, capability: "canReply" })` -- gated against the **root** post's `canReply`, not the immediate parent's.

:::caution[Known gap -- tracked as kowloon#40]
The handler does not separately check the immediate parent reply's author's block list if it differs from the root post author's block list. In practice: if you're blocked by the author of a specific reply (but not by the root post's author), you can still reply to that reply, because only the root's `canReply` is checked.
:::

## Content-based dedup

Identical `source.content` from the same actor to the same `parent`, within a 5-minute window, returns the existing Reply instead of creating a duplicate (`duplicated: true` in the response). This is independent of the `dedupeKey` mechanism described in [Overview](/docs/activities/overview/#idempotency).

## Side effects

- Bumps `User.replyCount` (the author), `replyCount` on the **root** object (tried across `Post`/`Page`/`Bookmark`/`Group`/`Circle` collections via the raw driver, bypassing Mongoose hooks) and its `FeedItems` cache entry -- and, for second-level replies only, also bumps the first-level parent reply's own `replyCount`.
- Notifies the author of the thing actually replied to (the immediate parent, not necessarily the root author), respecting `prefs.notifications.reply`.
- `notifyMentions` fires for `@user@domain` tags in the body.
- Federation is routed to the root post's host domain, plus the replied-to author's domain (via `getMultiFederationTargets`).

## Response

`{ activity, created: <Reply doc>, federation }` (or `{ ..., duplicated: true }` on a content-dedup hit).

## Client mapping

`reply({ postId, inReplyTo, content })` matches exactly -- `inReplyTo || postId` becomes `to`. The result's `target` field holds the **root** post's ID, not literally "the parent" in the colloquial sense; that's `parent`. If you're reading the created Reply back from the client, don't assume `target` means "what I replied to" -- use `parent` for that.

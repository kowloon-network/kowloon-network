---
title: "Federation: Follow, Unfollow, Accept, Undo, Announce"
description: The separate ActivityPub-interop follow mechanism underneath Circles, plus Undo and Announce.
sidebar:
  order: 9
---

:::note[Read this even if you're only building against Circles]
`server/CLAUDE.md`'s claim that Kowloon has "no follow/followers system" is accurate for the primary UX β€” Circles are the real follow graph for ordinary use (see [Architecture](/docs/architecture/#circles-replace-followfollowers)). But underneath that, the server maintains a **second, fully-implemented, parallel follow mechanism** using real ActivityPub `Follow`/`Accept`/`Undo{Follow}` semantics, purely for interop with remote, non-Kowloon actors. If you're integrating with the fediverse rather than just building a Kowloon-native client, you need this page.
:::

## Follow / Unfollow / Accept

- **Outbound Follow** (`handleOutboundFollow`) β€” a local user follows someone. Resolves the target (a local user, or fetches a remote AP actor's profile), adds them as a member of a target circle (defaults to the actor's own `circles.following` if no `target` given), notifies the followed local user (if any), and β€” for remote follows β€” updates `Server.actorsRefCount`/`serverFollowersCount` bookkeeping used by the federation poll scheduler. This heavily overlaps with `Add{target: followingCircle}` (both end up putting someone in your Following circle); the real differences are that `Follow` also sends notifications, updates poll-scheduling refcounts, and β€” for remote targets β€” sends an actual outbound ActivityPub `Follow` to their inbox (real federation, not just local bookkeeping).

- **Inbound Follow** (`handleInboundFollow`, triggered when `activity.federated && activity._inboundFollow`, or a remote `actorId` targeting a local-looking `object`) β€” a remote AP actor follows one of our local users.

  :::caution["Followers" is an ad-hoc circle, not one of the five documented System circles]
  Inbound Follow creates (if needed) an ad-hoc **"Followers"** System circle, found/created by `{ actorId: localUser.id, name: "Followers" }`. This is **not** one of the five documented System circles (Following / All Following / Groups / Blocked / Muted). It only exists because a remote actor followed you β€” a purely local user who never receives an inbound Follow will never have one.
  :::

  Adds the remote actor, fires a `follow` notification, and sends `Accept{Follow}` back to the remote actor's inbox (fire-and-forget).

- **Accept** (inbound only) β€” records receipt of a remote peer's `Accept{Follow}` against our own prior outbound `Follow` Activity record (`result.accepted = true`). Pure bookkeeping, no circle mutation. If the referenced Follow activity isn't found locally, it's logged, not treated as an error.

- **Unfollow** β€” mirror of outbound Follow's removal. Pulls the target from the actor's own circle (defaults to `circles.following`), and for remote targets decrements the `Server` refcount bookkeeping (which pauses/backs off future polling of that server if no one follows anything there anymore).

```json
{ "type": "Follow", "target": "circle:64f0...@kwln.org", "object": "@bob@remote.example" }
{ "type": "Unfollow", "target": "circle:64f0...@kwln.org", "object": "@bob@remote.example" }
```

**Auth**: `Unfollow` and outbound `Follow` require the actor to own the target circle. Inbound Follow/Accept/Undo{Follow} have no local-user auth concept at all β€” they're federation-inbound, gated instead by HTTP-signature verification upstream, not by this handler.

**Response**: `Follow` β†’ `{ activity, created: { status, followersCircle?, member? }, result, federation }` (outbound `status` is `followed`/`already_following`; inbound `status` is `follower_added`/`already_follower`). `Unfollow` β†’ `{ activity, result: { status, target } }` (`unfollowed`/`not_following`) β€” note this response shape omits `created`/`federation` keys entirely, unlike every other handler. Harmless in practice since `routes/outbox/post.js` only reads `result.created` optionally, but worth knowing if you're writing a client against the raw response shape.

:::danger[No client SDK method sends Follow or Unfollow]
Despite the names, the client SDK's `follow()`/`unfollow()` methods send `Add`/`Remove` against the Following circle (see [Membership](/docs/activities/membership/#add--remove)) β€” not `Follow`/`Unfollow`. This whole Follow/Unfollow/Accept trio (plus the Follow branch of `Undo`, below) is currently only reachable from federation-inbound traffic and hand-crafted activity payloads sent directly to `POST /outbox`. If you want genuine two-way ActivityPub follow federation with a non-Kowloon server, you need to construct and send `Follow`/`Unfollow` activities yourself β€” the convenience client methods won't do it for you.
:::

## Undo

Handles **inbound federated** undo semantics only β€” the generic ActivityPub-style undo, distinct from Kowloon's own dedicated `Unblock`/`Unmute`/`Unfollow` types. `activity.object` must be the full original activity being undone (an object, not just an ID):

```json
{
  "type": "Undo",
  "actorId": "https://remote.example/users/bob",
  "object": { "type": "Follow", "object": "@alice@kwln.org" }
}
```

```json
{
  "type": "Undo",
  "actorId": "https://remote.example/users/bob",
  "object": { "type": "React", "to": "post:64f0...@kwln.org" }
}
```

**Required**: `actorId`, `object` (must be present/truthy β€” there's no shape check beyond that).

Only two cases are implemented:

- `object.type === "Follow"` β€” removes the remote actor from the local user's ad-hoc "Followers" circle described above.
- `object.type === "React"` or `"Like"` β€” deletes the remote actor's React record for the target and recomputes react counts via the same recompute logic [React](/docs/activities/react/) uses.

Anything else is acknowledged and logged, but no action is taken (`status: "ignored"`).

**Response**: `{ activity, result: { status }, federation: { shouldFederate: false } }` always β€” `Undo` never re-federates.

## Announce

Inbound-only β€” no client SDK method sends this. A remote actor boosted/reshared one of our posts, or a third-party post.

```json
{
  "type": "Announce",
  "actorId": "https://remote.example/users/bob",
  "object": "https://kwln.org/posts/64f0..."
}
```

**Required**: `actorId`, `object` (a string URL or `{ id }`). If the announced object resolves to a local Post, increments its `shareCount` (both the Post doc and its `FeedItems` cache entry). Always upserts a synthetic `FeedItems` row of `type: "Announce"` (id `activity.remoteId`, or a generated `announce:<actorId>:<timestamp>` fallback) so the boost shows up in the announcer's followers' timelines.

**Response**: `{ activity, result: { status: "announced", announcedObjectId }, federation: { shouldFederate: false } }`.

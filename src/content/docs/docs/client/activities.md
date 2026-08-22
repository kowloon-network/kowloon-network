---
title: ActivitiesClient
description: Every write operation in the client -- posts, replies, reacts, circles, groups, and more.
sidebar:
  order: 2
---

`client.activities` is where every write operation in the library lives. Nearly every method funnels through a private `_post(activity)` helper that posts to `POST /outbox`. Full payload shapes, server-side validation rules, and response formats for each Activity type are documented in the [Activities section](/docs/activities/overview/) -- this page covers the client-side calling convention and any field-name remapping the client does before it reaches the wire.

`_post()` auto-injects an `actor` snapshot (built from the logged-in user via `_actorFromUser()`, deriving domain/inbox/outbox from the user's `@user@domain` id) onto the activity if one isn't already set -- you never need to construct this yourself.

## Posts

```js
await client.activities.createPost({
  type,          // 'Note' (default) | 'Article' | 'Link' | 'Media' | 'Event'
  to, canReply, canReact,
  content,       // alias: source
  title,         // alias: name
  href,          // alias: url
  tags,          // alias: tag
  location,
  startTime, endTime,   // Event only
  attachments,
  featuredImage,
  target,        // Link only -- the shared post's id
  dedupeKey,
})
```

Each aliased field pair (`content`/`source`, `title`/`name`, `href`/`url`, `tags`/`tag`) takes the first one that's set. `content` is required only when `type: 'Note'`. Tags accept plain strings or AS2 `Hashtag` objects and are normalized, stripping a leading `#` if present.

```js
await client.activities.updatePost({ postId, updates })
// or positionally:
await client.activities.updatePost(postId, updates)
```

:::caution[Field remapping]
`updates.content` does **not** become `object.content` on the wire -- it becomes `object.source = { content }`, because that's where the server's `Update` handler expects post content patches (see [Update](/docs/activities/update/)). Likewise, `to`/`canReply`/`canReact` patch values live nested inside `object`, not at the activity's top level.
:::

```js
await client.activities.deletePost({ postId })
```

## Replies and reacts

```js
await client.activities.reply({
  postId,
  inReplyTo,     // optional -- id of a reply, for a second-level reply
  content,
  mediaType,     // default 'text/markdown'
  attachments,
  dedupeKey,
})
```

Two-level Facebook-style threading: replying straight to a post is first-level; passing `inReplyTo` answers that reply, capped at depth 2 server-side (see [Reply](/docs/activities/reply/) for the full threading model). The created reply's **`target`** field holds the id of whatever it replies to -- not `inReplyTo`, despite the parameter name you pass in.

`createReply(options)` is a compatibility alias accepting a legacy `{ toItemId, body }` shape, normalized internally to `reply()`.

```js
await client.activities.updateReply({ replyId, content, tags })
```

Only `content`/`tags` are server-allowlisted as editable on a Reply.

```js
await client.activities.react({ postId, emoji, name })      // set/replace
await client.activities.react({ postId, emoji: '' })        // clear
```

One reaction per user per target -- this is an upsert, not an append. A truthy `emoji` string sets or replaces your existing reaction; an empty/omitted `emoji` clears it. On clear, the client deliberately omits `object.type` from the payload -- if it were present, the server's fallback field-resolution (`object.react || object.emoji || object.type`) could misread it as the emoji value. The response is `{ ok, result: { status: 'reacted', react, bumped } }` -- there's no id, since this is an upsert, not a create.

There is no `deleteReact()` method. `react({ postId, emoji: '' })` above is the only (and correct) way to clear a reaction.

## Circles

```js
client.activities.createCircle({ name, description, icon, to })
client.activities.updateCircle({ circleId, updates })
client.activities.deleteCircle({ circleId })

client.activities.addToCircle({
  circleId,
  memberId,     // single -- alias: userId
  memberIds,    // array of ids
  members,      // array of ids OR pre-hydrated {id, name, icon, ...} objects
})
client.activities.removeFromCircle({ circleId, memberId })
```

`addToCircle` accepts a single member three different ways (`memberId`, `userId` as an alias, or a one-item `members`/`memberIds` array) plus batch adds via `memberIds`/`members`. Passing pre-hydrated member objects via `members` (rather than bare id strings) avoids a redundant server-side lookup -- useful for circle-copy flows where you already have the full member records in hand.

Both `addToCircle` and `removeFromCircle` call `this.moderation?.invalidate()` whenever the target circle is the user's own `blocked` or `muted` system circle -- this is also the path used for a whole-server block/mute (adding a bare `@domain` entry), rather than the dedicated `block()`/`mute()` methods below.

## Groups

```js
client.activities.createGroup({
  name, description, icon, image, location,
  rsvpPolicy,          // alias: membershipPolicy -- rsvpPolicy wins if both are set
})
client.activities.updateGroup({ groupId, updates })

client.activities.joinGroup({ groupId })
client.activities.leaveGroup({ groupId })
client.activities.approveJoinRequest({ groupId, userId })
client.activities.rejectJoinRequest({ groupId, userId })
```

`rsvpPolicy` values: `open`, `serverOpen`, `serverApproval`, `approvalOnly` (see [membership activities](/docs/activities/membership/) for what each one means). Joining an `approvalOnly` group returns `result.status === 'pending'` rather than throwing -- check the status, don't assume success means "joined."

`rejectJoinRequest()` sends `{ type: 'Remove', to: groupId, object: userId }` -- there's no dedicated "Reject" activity type. The server's `Remove` handler already falls back to the group's Pending circle when the target isn't found in Members, which is exactly what rejecting a pending request means; this mirrors `approveJoinRequest()`'s `Add`-based pattern above.

## Bookmarks

```js
client.activities.createBookmark({
  type,           // 'Bookmark' (default) | 'Folder'
  href,           // required for type: 'Bookmark'
  title,
  parentFolder,
  to, canReply, canReact,   // canReply/canReact default to 'public'
  body,
  image,          // alias: featuredImage
  tags,
  dedupeKey,
})
client.activities.updateBookmark({ bookmarkId, updates })
```

`body` is sent as `source: { content: body, mediaType: 'text/markdown' }` so the server's pre-save hook can render it. Setting `updates.parentFolder: null` on `updateBookmark` moves the bookmark to the root level.

## Pages

```js
client.activities.createPage({
  type,           // 'Page' (default) | 'Folder'
  title, body, to, canReply, canReact, parentId, featuredImage, tags, attachments,
})
client.activities.updatePage({ pageId, updates })
```

`body` maps to `object.content` for both create and update.

## User actions

```js
client.activities.updateProfile({ updates })            // or the fields directly
client.activities.setPins({ circles, groups })           // full ordered id arrays, not deltas
client.activities.follow({ userId })
client.activities.unfollow({ userId })
client.activities.block({ userId })
client.activities.unblock({ userId })
client.activities.mute({ userId })
client.activities.unmute({ userId })
client.activities.flag({ targetId, reason, notes })
client.activities.upload(options)   // delegates directly to client.files.upload()
```

`updateProfile` posts `{ type: 'Update', objectType: 'User', target: userId, object: updates }`. `setPins` is a thin wrapper over `updateProfile` that writes `prefs.pinnedCircles`/`prefs.pinnedGroups` -- pass the **full** ordered array each time, not just the items you're adding or removing.

`follow`/`unfollow` are `Add`/`Remove` against the user's own `following` circle id (read from `auth._user.following`, populated at login) -- **there is no separate Follow/Unfollow activity type at all.** Circles are the only follow mechanism; see [Architecture](/docs/architecture/#circles-replace-followfollowers).

`block`/`unblock`/`mute`/`unmute` each call `this.moderation?.invalidate()` after a successful post, so `client.moderation`'s cached exclusion set stays in sync without you having to call `invalidate()` yourself.

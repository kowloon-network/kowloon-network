---
title: The Activity Envelope
description: The common request/response shape every Activity shares -- validation, addressing grammar, and idempotency.
sidebar:
  order: 1
---

Every write to Kowloon goes through `POST /outbox` with an **Activity envelope**. This page covers everything that's true for every Activity type before you get into the specifics of any one of them. Read this first -- the per-type pages assume it.

## Pipeline

```
POST /outbox
  -> normalize the envelope (routes/outbox/post.js)
  -> validate against activity.schema.js (AJV)
  -> methods/activities/create.js (createActivity)
  -> ActivityParser/handlers/<Type>/index.js
  -> persist an Activity document
  -> optionally enqueue federation
```

`ActivityParser/index.js` itself is just the handler-loading factory: it scans `handlers/` and auto-registers each subfolder's default-exported function under its directory name, no central list to maintain. Adding a new handler *function* really is just dropping a new `handlers/Whatever/index.js` -- but making that type reachable via `POST /outbox` still requires adding it to `activity.schema.js`'s `type` enum by hand, since `createActivity()` validates against that central schema before it ever looks up a handler.

### Two layers of validation

1. **Schema-level, once, centrally.** `createActivity()` validates the whole envelope against `activity.schema.js` (AJV) before dispatching anywhere -- envelope shape, `type` enum membership, the addressing grammar, and (for `Create`/`Reply`/`React` specifically) extra conditional rules like requiring `object.type`.
2. **Business-logic, inside each handler, on itself.** Several handlers (`Create`, `Update`, `Delete`, `Reply`, `React`, `Join`, `Leave`, `Undo`) export their own `validate(activity)` function and call it on themselves at the top of their default export, before doing any work. The rest (`Add`, `Remove`, `Block`, `Unblock`, `Mute`, `Unmute`, `Flag`) skip the separate named function and just do inline guard checks through the handler body -- same effect, less ceremony. This layer covers what AJV can't express: does the target actually exist, is the actor allowed to do this, does a reason code match a configured option.

## What happens before validation

`routes/outbox/post.js` normalizes every incoming request before the schema ever sees it:

- **Auth.** `POST /outbox` requires a JWT-authenticated user for every Activity **except** `Create` with `objectType: "User"` (or `object.type` of `User`/`Person`) -- that's the account-registration path, and it runs unauthenticated with `activity.actorId` force-set to the server's own actor (`@<domain>`).
- For every other request, **`activity.actorId` is always overwritten** with the JWT user's id. A client cannot spoof `actorId`.
- `activity.actor` (the embedded actor snapshot) is auto-populated from the JWT user if the client didn't send one: `{ id, type, name, icon, url, inbox, outbox, server }`.
- `to`/`canReply`/`canReact` default to **the actor's own id** if absent -- on both the activity itself and, for every type except `Update`/`Delete`, on `activity.object` too. (`Update`/`Delete` treat `object` as a patch, not a fresh object, so they're deliberately skipped here.) This makes the safe default actually private: `canSeeObject()` treats an empty/missing `to` as *server-wide* visible, so before this default was in place, omitting `to` silently meant "visible to everyone on the server," not "private." Addressing something only to its own creator's id falls through every other visibility check to `return false`, so nobody but the owner (who's always allowed to see their own content) can see it.
- Shorthand values are expanded: `"public"` -> `"@public"`, `"server"` -> `"@<domain>"`.
- `outboxRateLimiter` and `activityDeduplicator` middleware run before the handler (see [Idempotency](#idempotency) below).

## The envelope schema

Validated with AJV against `activity.schema.js` (`https://kwln.org/activity.schema.json`). Top level: `additionalProperties: true`, `required: ["type", "actorId"]`.

```js
type: enum [
  "Add", "Block", "Create", "Delete", "Flag",
  "Join", "Leave", "Mute", "React", "Remove", "Reply",
  "Unblock", "Undo", "Unmute", "Update"
]  // 15 values

actorId: anyOf [ "@user@domain", "@domain" (server) ]  // always this format -- local AND remote actors, no exceptions

objectType: enum [
  "Bookmark", "Circle", "Group", "Page",
  "Post", "React", "Reply", "User"
]  // 8 values

object: {}       // untyped at the schema level; each handler validates its own shape
target: { type: "string" }
summary: { type: "string" }
to / canReply / canReact: "replyReactRecipient" schema (see below)
```

### Addressing value grammars

`to`/`canReply`/`canReact` are validated against one of two grammars depending on context:

**`toRecipient`** (used for `Create`'s `to`):
`""`, `"@public"`, coarse `"audience"|"public"|"server"|"followers"`, `@<domain>` (server handle), `circle:...@domain`, `group:...@domain`, `@user@domain` (actorId), or an `https?://` URL.

**`replyReactRecipient`** (used for `Reply`'s and `React`'s `to`, and as the general schema for `to`/`canReply`/`canReact` everywhere else): everything `toRecipient` accepts, **plus** `"none"`, `post:...@domain`, `page:...@domain`, `bookmark:...@domain`, `reply:...@domain`. It accepts direct object-ID targets because for `Reply` and `React`, `to` isn't an audience at all -- it's "what object am I acting on."

### ID regex patterns

```js
actorId:      ^@[^@\s]+@[a-z0-9.-]+$
serverHandle: ^@[a-z0-9.-]+$
publicToken:  ^@public$
circleId:     ^circle:[^@\s]+@[a-z0-9.-]+$
groupId:      ^group:[^@\s]+@[a-z0-9.-]+$
postId:       ^post:[^@\s]+@[a-z0-9.-]+$
pageId:       ^page:[^@\s]+@[a-z0-9.-]+$
bookmarkId:   ^bookmark:[^@\s]+@[a-z0-9.-]+$
objectId:     ^(circle|group|post|page|bookmark|reply):[^@\s]+@[a-z0-9.-]+$
```

### Conditional validation (`allOf`)

Three blocks tighten the schema further depending on `type`:

- **`Create`** -- requires `["objectType", "object"]`; `to` must match `toRecipient` (the audience grammar); `object.type` is required.
- **`Reply`** -- requires `["objectType", "object", "to"]`; `objectType` must be the literal string `"Reply"`; `to` must match the `objectId` pattern (it must be a real post/page/bookmark/reply/circle/group ID -- the parent being replied to); `object.type`, if present, must be `"Reply"`.
- **`React`** -- requires `["objectType", "object", "to"]`; `objectType` must be the literal string `"React"`; `to` must match `objectId`; `object.type`, if present, must be `"React"` (deliberately optional -- see [React](/docs/activities/react/) for why).

## Response shape

Every `POST /outbox` call returns the same envelope shape.

**Success** (HTTP 200):

```json
{
  "ok": true,
  "activity": { "...": "the persisted Activity envelope, incl. mongo id, dedupeKey, federated flag" },
  "result": { "...": "handler-specific result -- see each type's page" },
  "createdId": "post:64f...@kwln.org",
  "federate": false,
  "duplicated": true,
  "federationJob": { "jobId": "...", "recipients": 3, "counts": {} }
}
```

`duplicated` is only present when a dedupe hit occurred. `federationJob` is only present if federation was actually enqueued.

**Failure**: HTTP status is `result.status` if the handler set one (e.g. a visibility/block gate returns 404, a disabled `canReply`/`canReact` returns 403), otherwise 400. Body: `{ "error": "..." }`.

## Idempotency

Three independent mechanisms, all checked before the handler runs (the first two) or handled inside the handler itself (the third):

1. **`activity.remoteId`** -- federation-sourced activities dedupe by exact `remoteId` match.
2. **`activity.dedupeKey`** -- a client-supplied idempotency key. The client SDK's `createPost`, `reply`, and `createBookmark` methods (among others) all accept one. Dedupes by exact string match against `Activity.dedupeKey`.
3. **Reply-specific content dedup** -- identical `source.content` from the same actor to the same immediate `parent` within a 5-minute window returns the existing Reply instead of creating a duplicate (`duplicated: true` in the response). This is independent of `dedupeKey` and only applies to Reply.

`Create` also has its own idempotency backstop against a MongoDB unique-index collision (`E11000`) for double-submitted creates, returning the existing document rather than erroring. These three-plus-one mechanisms don't overlap -- which one applies depends on the Activity type and how the client submitted the request.

## Next

Start with the type you need, or read them in order for the full picture: [Create](/docs/activities/create/) | [Update](/docs/activities/update/) | [Delete](/docs/activities/delete/) | [Reply](/docs/activities/reply/) | [React](/docs/activities/react/) | [Membership (Join/Leave/Add/Remove)](/docs/activities/membership/) | [Moderation (Block/Mute)](/docs/activities/moderation/) | [Undo](/docs/activities/undo/) | [Flag](/docs/activities/flag/) | [Known gotchas](/docs/activities/gotchas/).

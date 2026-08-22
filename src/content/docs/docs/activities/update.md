---
title: Update
description: Patch an existing Post, Circle, Group, Page, Bookmark, Reply, React, or User.
sidebar:
  order: 3
---

`Update` patches an existing object. Unlike `Create`, dispatch is **not** by `objectType` -- it's by parsing the `target` ID's prefix (`kowloonId()`) and looking up `MODELS[parsed.type]`. If the client sends `objectType`, it's cross-checked against the same `MODELS` map, but it isn't load-bearing for dispatch.

```json
{
  "type": "Update",
  "target": "post:64f0...@kwln.org",
  "object": { "title": "Edited title", "source": { "content": "new body" }, "to": "@public" }
}
```

`activity.object` here is a **patch**, not a full replacement -- only fields present are touched. This is why `routes/outbox/post.js` explicitly skips injecting default `to`/`canReply`/`canReact` into `object` for `Update` (and `Delete`) -- those handlers treat `object` as the source of truth for what's actually changing, not something to fill in defaults on.

## Allowed fields per type

Anything not in the list below is silently stripped from the patch.

| Type | Allowed fields |
|---|---|
| `User` | `profile`, `prefs`, `to`, `canReply`, `canReact`, `email`, `username` |
| `Post` | `title`, `summary`, `source`, `body`, `type`, `tags`, `to`, `canReply`, `canReact`, `image`, `attachments`, `href`, `target`, `location`, `event` |
| `Reply` | `source`, `body`, `tags` -- note: **no** `to`/`canReply`/`canReact`, matching the invariant that a Reply's own addressing fields always stay blank (see [Reply](/docs/activities/reply/)) |
| `Page` | `title`, `summary`, `source`, `body`, `slug`, `tags`, `to`, `canReply`, `canReact`, `image`, `attachments`, `href`, `parentId`, `order` |
| `Bookmark` | `title`, `summary`, `source`, `body`, `type`, `tags`, `to`, `canReply`, `canReact`, `href`, `target`, `parentFolder`, `image` |
| `Circle` | `name`, `summary`, `icon`, `to`, `canReply`, `canReact` |
| `Group` | `name`, `summary`, `icon`, `image`, `to`, `canReply`, `canReact`, `rsvpPolicy`, `location` |
| `React` | `emoji`, `name` |

## Auth

Owner (`current.actorId`, or `current.id` for `User` targets) **or** a server admin (`isServerAdmin`). There is no group-admin exception here -- editing a Group's own fields is owner/admin-only, distinct from `isGroupAdmin`, which is used by [Add/Remove](/docs/activities/membership/#add--remove).

## Special cases

- **`User.to` is capped to `@public` or `@<own-domain>` only.** Any other value -- including a circle ID -- is rejected with `"Update: User.to must be '@public' or '@<own-domain>'"`.
- **System Circles** (`type: "System"`) reject `name`/`summary`/`icon` patches -- those are load-bearing identity fields, not user-editable. Membership (via `Add`/`Remove`) stays editable.
- **Circle `canReply`/`canReact`** always mirror `to` if `to` is in the patch; otherwise they're dropped entirely from the patch if sent without `to`.
- **Password change** is a separate, owner-only path: `object.password = { current, new }`, requires `bcrypt.compare` against the stored hash, `new` must be >=8 chars. Admins cannot change another user's password through `Update`.
- **`save()` vs `findOneAndUpdate`**: content-bearing types (`Post`/`Reply`/`Page`) whose `source.content` changed go through `.save()` -- not `findOneAndUpdate` -- specifically so the model's pre-save hook re-renders `body`/`summary`/`textPreview`/signature from the new source. Every other patch uses `findOneAndUpdate`.
- Raw HTML in `source.content` is stripped the same way as `Create`.
- `Post.target` changes trigger a server-side `targetActor` recompute (same non-client-trusted resolution as `Create`).

## Side effects

- `FeedItems` cache synced for `Post`/`Reply`/`Page`/`Group`/`Circle` (Bookmarks excluded -- they're personal utility, not feed content). The `to`/`canReply`/`canReact` values are coarsened into `public`/`server`/`audience` tiers for the cache -- this coarsening is display-only; real enforcement always reads the raw value via `authorizeInteraction` (see [Architecture](/docs/architecture/#addressing-to-canreply-canreact)).
- User profile `name`/`icon` changes propagate to all denormalized actor-embed copies across the DB via `refreshActorCache` (fire-and-forget).
- The result object has `password`/`privateKey`/`publicKeyJwk`/`signature` stripped before returning, for `User` targets.

## Response

`{ activity, created: <updated doc, sanitized>, result: same, federation }`.

## Client mapping

`updatePost`, `updateReply`, `updateCircle`, `updateGroup`, `updateBookmark`, `updatePage`, `updateProfile` all map correctly. `updatePost` sends `patch.content` wrapped as `object.source = { content }` -- not as a top-level `content` field -- and `to`/`canReply`/`canReact` are nested inside `object`, not at the activity's top level. This matches the handler's `filterPatch`/`ALLOWED_FIELDS` logic exactly.

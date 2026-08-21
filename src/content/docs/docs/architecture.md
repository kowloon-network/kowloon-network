---
title: Architecture
description: How the Kowloon server is put together — Circles, addressing, the write path, FeedItems, and federation.
sidebar:
  order: 1
---

This page is the front door to the rest of the developer docs. It covers the handful of concepts that everything else assumes you already know. The [Activities](/docs/activities/overview/), [REST API](/docs/api/overview/), and [Client Library](/docs/client/overview/) sections carry the exhaustive detail — this page is deliberately brief.

## Circles replace follow/followers

Kowloon has no first-class "follow" feature in its primary UX. Instead, every user has **Circles** — named groups of members they control. Adding someone to your `following` Circle is, functionally, following them. There's no separate followers list, no follower count, and no notification when someone adds you to a Circle (adding is a private, one-directional act).

A handful of Circles are created automatically for every user and are treated as structural, not just conventional — most notably `following`, `allFollowing`, `groups`, `blocked`, and `muted`. Content pulled into a Circle only ever shows up in the feeds of the Circle's owner.

Adding someone to a Circle is always the same `Add` activity, whether it's a user-made circle or the built-in `following` circle — the client's `addToCircle()` and `follow()` methods both send `{ type: "Add", target: circleId, object: member }`, just aimed at a different circle. There's no separate "Follow" activity in the real, supported app.

## Addressing: `to`, `canReply`, `canReact`

Every addressable object (Posts, Circles, Groups, Pages, Bookmarks) carries three fields that control who can see it and who can interact with it:

- **`to`** — who can see the object at all.
- **`canReply`** — who can reply to it.
- **`canReact`** — who can react to it.

Each accepts the same grammar of values:

- `@public` — visible to anyone, local or remote.
- `@<domain>` (a bare server handle, e.g. `@kwln.org`) — visible to any authenticated user on that server.
- `circle:<id>@<domain>` / `group:<id>@<domain>` — visible to members of that Circle or Group.
- `@user@domain` — visible to that one actor directly.

**Enforcement is always against the live value**, via `authorizeInteraction()` (for replies/reactions) and `canSeeObject()` (for visibility) — these read the object's current `to`/`canReply`/`canReact` fields at request time. The [`FeedItems`](#feeditems-the-timeline-cache) cache stores a *coarsened* version of these tiers (`public` / `server` / `audience`) purely so timeline queries can filter cheaply without joining back to the source object. That coarsening is display/filtering-only — it is never treated as authoritative, and a client should never assume the coarsened tier alone determines access.

## The write path

All writes go through one door: `POST /outbox`, with an **Activity envelope** — `{ type, actorId, objectType?, object?, target?, to?, canReply?, canReact? }`.

1. The route normalizes the request (forces `actorId` to the authenticated user, expands `public`/`server` shorthand, defaults `to`/`canReply`/`canReact`).
2. The envelope is validated against an AJV schema.
3. `ActivityParser` dispatches to exactly one handler based on `activity.type` (for most types) or by parsing the `target` ID's prefix (for `Update`/`Delete`).
4. The handler does the actual work — creating/mutating documents, updating `FeedItems`, firing notifications, deciding what (if anything) to federate — and returns a result that becomes the HTTP response.

Every Activity type — `Create`, `Update`, `Delete`, `Reply`, `React`, `Join`, `Leave`, `Add`, `Remove`, `Block`, `Unblock`, `Mute`, `Unmute`, `Undo`, `Announce`, `Flag` — has its own handler under `ActivityParser/handlers/`. The full envelope shape, validation rules, and per-type behavior are covered starting at [Activities → Overview](/docs/activities/overview/).

## FeedItems: the timeline cache

`FeedItems` is a read-optimized fan-out cache, not a source of truth. When a Post, Reply, Page, Group, or Circle is created or updated through the normal Activity pipeline, the handler calls `writeFeedItems()` to keep a denormalized, timeline-friendly copy in sync — this is what powers `GET /posts`, circle timelines, and group feeds without expensive joins on every read.

The important consequence: **anything that writes to a model directly (`Model.create()`, `findOneAndUpdate()` outside a handler) bypasses `FeedItems` entirely** and will not show up in feeds until something else backfills it. If you're building server-side tooling that needs to appear in a timeline, go through the Activity pipeline (`POST /outbox` or the internal `createActivity()`/`activity.parse()` call), not the model directly.

Bookmarks are the one addressable type deliberately excluded from `FeedItems` — they're personal-only and never appear in any feed (see [Create → Bookmark](/docs/activities/create/#bookmark)).

## Federation, briefly

Kowloon speaks a dialect of ActivityPub for server-to-server delivery. You'll see these terms elsewhere in the docs:

- **Inbox delivery** — remote servers `POST` signed activities to `/inbox` (or a per-user/per-group inbox) for real-time delivery.
- **Batch pull** — `GET /outbox?from=&to=` lets a server pull a batch of another server's public activities, used for catching up and for the primary server-subscription firehose model.
- **`originDomain`** — any object cached locally that actually lives on another server (a remote user's profile, a post pulled in via a Circle) is marked with the domain it came from, so local queries can distinguish "ours" from "cached copy of theirs."

Federation mechanics aren't the focus of this section — they come up as needed in the Activities and API pages where a given handler's federation behavior matters.

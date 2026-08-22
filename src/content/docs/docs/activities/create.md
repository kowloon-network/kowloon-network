---
title: Create
description: Create a Post, Circle, Group, Page, Bookmark, or User.
sidebar:
  order: 2
---

`Create` makes a new object. Dispatch is by `activity.objectType`, looked up in the handler's `MODELS` map: `Bookmark`, `Circle`, `Group`, `Page`, `Post`, `React`, `Reply`, `User`.

:::note
`React` and `Reply` are listed in `Create`'s own `MODELS` map for completeness, but the schema's conditional validation (see [Overview](/docs/activities/overview/#conditional-validation-allof)) requires them to go through their own dedicated `type: "Reply"` / `type: "React"` activities instead -- `type: "Create", objectType: "Reply"` won't reach here as the intended path. See [Reply](/docs/activities/reply/) and [React](/docs/activities/react/).
:::

**Required** (beyond the envelope schema): `objectType` (must be a `MODELS` key), `object` (an object), `to` (a string), `canReply` and `canReact` (both must be defined, any type). For `objectType: "User"`: `object.password` (or the legacy `object.pass`) is required, plus either `object.username` or `object.actorId`/`object.id`.

## Post

```json
{
  "type": "Create",
  "objectType": "Post",
  "to": "@public",
  "canReply": "@public",
  "canReact": "@public",
  "object": {
    "type": "Note",
    "content": "Hello world",
    "tags": ["intro"],
    "location": { "name": "SF", "lat": 37.77, "lon": -122.41 },
    "attachments": [{ "fileId": "file:65f...@kwln.org" }],
    "featuredImage": "file:65f...@kwln.org"
  }
}
```

Post types: `Note`, `Article`, `Link`, `Media`, `Event`.

- For `Event`, send `object.startTime`/`object.endTime` (ISO strings) -- the handler maps these into `object.event.startDate`/`endDate`.
- For `Link` (sharing another Kowloon post), send `object.target` = the shared post's ID. The server resolves `targetActor` itself from `FeedItems` -- a client-sent `targetActor` is always stripped, since it's a third-party attribution claim that must not be client-trusted.

## Circle

```json
{
  "type": "Create",
  "objectType": "Circle",
  "to": "", "canReply": "", "canReact": "",
  "object": { "type": "Circle", "name": "Close Friends", "summary": "inner circle", "icon": "file:..." }
}
```

`to` defaults to the creator's own actorId if blank (owner-scoped). `canReply`/`canReact` are always force-set to mirror `to` regardless of what's sent -- not independently meaningful yet, kept for a hypothetical future circle-comments feature.

## Group

```json
{
  "type": "Create",
  "objectType": "Group",
  "to": "@public",
  "object": {
    "type": "Group",
    "name": "Book Club",
    "description": "...",
    "rsvpPolicy": "serverOpen",
    "location": {}
  }
}
```

`rsvpPolicy` drives [`Join`](/docs/activities/membership/#join) approval logic: `open`, `serverOpen`, `serverApproval`, `approvalOnly`, `inviteOnly`.

Creating a Group auto-creates 5 system Circles (Admins/Moderators/Members/Blocked/Pending) via the model's pre-save hook -- the handler re-fetches the doc afterward because those circle IDs aren't present on the pre-save return value. The creator is also added to their own `circles.groups` System circle.

## Bookmark / Folder

```json
{
  "type": "Create",
  "objectType": "Bookmark",
  "object": {
    "type": "Bookmark",
    "title": "Cool site",
    "href": "https://example.com",
    "parentFolder": "bookmark:...@kwln.org"
  }
}
```

`type: "Folder"` records omit `href`. Max folder depth is 2, enforced at create time.

:::note
Bookmarks never federate -- `getFederationTargets` is hardcoded to `{ shouldFederate: false }` for this type. To broadcast a URL, post a `Link` instead.
:::

## Page

```json
{
  "type": "Create",
  "objectType": "Page",
  "object": { "type": "Page", "title": "About", "content": "markdown body...", "slug": "about" }
}
```

## User (registration)

```json
{
  "type": "Create",
  "objectType": "User",
  "object": { "username": "alice", "password": "hunter2improved" }
}
```

This is the **only** unauthenticated `POST /outbox` path (see [Overview](/docs/activities/overview/#what-happens-before-validation)). `activity.actorId` is forced to the server actor by `routes/outbox/post.js`.

## Side effects (all types except User)

- `activity.object.actorId`/`.actor` populated from the authenticated actor if missing.
- Markdown content is stripped of raw HTML (only `<u>`/`<s>` allowed) via `stripHtmlFromMarkdown`; `source.mediaType` is forced to `text/markdown`.
- Addressing (`to`/`canReply`/`canReact`) normalized to the canonical scheme.
- `location` normalized to GeoJSON `{ type: "Point", coordinates: [lng, lat] }`.
- `featuredImage` -> `image`; attachment objects -> bare file-ID strings.
- Referenced `file:` IDs get `File.parentObject` back-linked for visibility inheritance (only if not already set).
- `writeFeedItems(created, type)` -- fans the object into the `FeedItems` timeline cache. This is what makes it show up in `GET /posts` etc. -- a direct `Model.create()` skips this (see [Architecture](/docs/architecture/#feeditems-the-timeline-cache)).
- Post creation increments `User.postCount`; Circle creation triggers async mosaic-icon regeneration; new Groups add the group to the creator's `circles.groups` System circle.
- Notifications: `new_post` feed nudges (throttled 12h, opt-in) + `@mention` notifications for local users tagged in the body -- both fire-and-forget.
- Fire-and-forget: external `og:image` URLs on Posts get proxied into local storage.

## Response

`{ activity, created: <full Model doc as plain object>, federation }`. On a DB unique-key collision (`E11000`, from a duplicate submit), returns the *existing* document instead of erroring.

## Auth

Any authenticated user (the `Create -> User` registration path is the unauthenticated exception). No ownership check is needed -- you're creating your own object.

## Client mapping

`createPost`, `createCircle`, `createGroup`, `createBookmark`, `createPage` all map 1:1 to this shape. Field names match -- the client sends `content`/`href`/`featuredImage`/`tags` at the top level of `object`, matching what the handler expects.

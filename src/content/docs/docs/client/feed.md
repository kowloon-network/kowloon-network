---
title: FeedClient
description: Every read operation in the client -- timelines, single-object lookups, listings, and collections.
sidebar:
  order: 3
---

`client.feeds` covers every read (`GET`) operation. Field-level response shapes and query parameters are documented per-endpoint in the [REST API section](/docs/api/overview/) -- this page covers the method surface and calling convention.

## Server info and previews

```js
client.feeds.getServerInfo()                 // GET /
client.feeds.getLinkPreview({ url })          // GET /preview
```

`getLinkPreview` is what a post composer calls to render a link-preview card -- the server does the fetching (with an SSRF guard against loopback/private hosts), not the client.

## Timelines

```js
client.feeds.getServerPosts({ serverId, type, types, to, page, since })
client.feeds.getServerPages({ ... })
client.feeds.getCirclePosts({ circleId, types, type, before, limit })
client.feeds.markCircleSeen({ circleId, lastSeenAt })
client.feeds.getGroupPosts({ ... })
client.feeds.getUserPosts({ ... })
```

`to` on `getServerPosts` restricts results to a single visibility tier (`'public'` or `'server'`); omit it to get the server's default merged view. `markCircleSeen` advances a circle's read high-water mark -- it's idempotent and will never move the mark backward (`PATCH /circles/:id/seen` server-side).

## Single-object lookups

```js
client.feeds.getPost({ postId })
client.feeds.getGroup({ groupId })
client.feeds.getUser({ userId })
client.feeds.getBookmark({ bookmarkId })
client.feeds.getPage({ pageId, domain })   // domain hydrates a cached remote page
client.feeds.getCircle({ circleId })
```

`getUser` has a fallback: if the lookup 404s **and** the id looks like `@name@remote-domain`, it retries via `lookup()` (below) to fetch-and-cache the remote profile. A 404 on a plain local user id is not retried -- it's just a 404.

## Listings

```js
client.feeds.getGroups({ ... })
client.feeds.getCircles({ sort })   // 'date' | 'reacts' -- network-visible circles
client.feeds.getRecommendations()   // viewer-aware Discover shelves
client.feeds.getServers()           // known federated servers
client.feeds.getServer({ domain, refresh })
```

`getCircles` returns circles visible on the network generally -- for the current user's **own** circles, use `getUserCircles` below, not this method.

## Collections

```js
client.feeds.getGroupMembers({ groupId, ... })
client.feeds.getCircleMembers({ circleId, ... })
client.feeds.getUserCircles({ userId, contains })
client.feeds.getUserGroups({ userId, ... })
client.feeds.getUserBookmarks({ userId, ... })
client.feeds.getReplies({ postId, ... })
client.feeds.getReacts({ postId, ... })
```

`getUserCircles`'s `contains` param is owner-only -- pass a member id and each returned circle is annotated with `contains: boolean`, pre-flagging whether that member is already in it. This is what backs an "add to circle" picker UI that needs to show current membership state without a separate round trip per circle.

## Lookup and search-adjacent helpers

```js
client.feeds.lookup({ id })      // GET /lookup -- resolves ANY Kowloon id
client.feeds.lookupUser({ id })  // deprecated alias for lookup
client.feeds.searchUsers({ q })  // convenience wrapper -- distinct from client.search
```

`lookup()` resolves any Kowloon id -- local, already-cached, or freshly fetched and hydrated from a remote server -- and requires auth (the server does the outbound fetch on your behalf, so it needs to know who's asking). `searchUsers` here is a lightweight convenience wrapper; for the full-featured search surface (multiple content types, `searchIn` filtering), use [`client.search`](/docs/client/notifications-search-themes/) instead.

## Files

```js
client.feeds.getFile({ fileId })   // metadata only -- GET /files/:id/meta
```

This returns file metadata, not the file's binary content -- see [FilesClient](/docs/client/files/) for uploading and building serving URLs.

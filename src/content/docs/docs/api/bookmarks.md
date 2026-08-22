---
title: Bookmarks
description: /bookmarks/* -- personal, non-federating bookmark and folder storage.
sidebar:
  order: 5
---

Bookmarks never federate -- see the [Activities: Create -> Bookmark](/docs/activities/#create) docs. To broadcast a URL to your audience, post a `Link`-type Post instead.

### `GET /bookmarks`
`makeCollection`, viewer-scoped via `buildVisibilityQuery`.

:::note[Root-level only]
This only returns bookmarks/folders where `parentFolder` is unset (i.e. the top level). Walking into a specific folder's contents is **only** exposed via [`GET /users/:id/bookmarks?parentFolder=<id>`](/docs/api/users/#get-usersidbookmarks) -- this asymmetry is deliberate, to prevent a folder-visibility-inheritance bypass (see below).
:::

### `GET /bookmarks/:id`
Via [`makeGetById()`](/docs/api/overview/#the-makegetbyid-helper), but with a custom `canView` (`canSeeBookmark`) that additionally requires the **entire ancestor folder chain** to be visible. A `@public` bookmark nested inside a private folder is still hidden from non-owners -- folder visibility isn't just a UI grouping, it's enforced at the read layer.

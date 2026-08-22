---
title: Pages
description: /pages/* -- always-public static content pages, including remote page hydration.
sidebar:
  order: 6
---

### `GET /pages`
`makeCollection`. Always filtered to `to: "@public"` -- non-public pages are never listed here. Query params: `?tag=`, `?serverId=`. Sorted `order asc, createdAt desc`.

### `GET /pages/:id`
Lookup by id **or** slug, `deletedAt: null`.

Optional `?domain=<remote>` hydrates a shadow copy from a remote Kowloon server (`hydrateRemotePage`), so the app can render a foreign server's page in-app. Non-Kowloon domains are implicitly rejected via an `isLocalDomain` check.

`404` if not found. Browser navigations defer to the SPA.

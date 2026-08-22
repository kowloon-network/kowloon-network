---
title: Config, Health, Themes, Push & Recommendations
description: /config.json, /health, /themes/*, /push/*, and the public /recommendations Discover feed.
sidebar:
  order: 13
---

## Config

### `GET /config.json`
Unauthenticated. Public runtime config for frontend bootstrapping:
```json
{ "apiUrl": "...", "domain": "...", "siteTitle": "...", "registrationIsOpen": true }
```

## Health

### `GET /health`
CORS-open (`Access-Control-Allow-Origin: *`, so the setup wizard can poll it cross-origin during install) liveness check. Returns `200` with `{ status: "ok", timestamp, services: { mongodb: "connected" } }`, or `503` with `status: "error"` if MongoDB is disconnected.

This used to be defined twice (a duplicate top-level handler in `index.js`, plus this router) with an unresolved question of which one actually answered requests. Confirmed by direct testing and consolidated: the router above always won route resolution, so the duplicate (and the unreferenced `/__health` alias alongside it) was removed. `/health` is now the only handler and the only path.

## Themes (`/themes/*`)

Three built-in themes (`system`, `kowloon-light`, `kowloon-dark`) are seeded on module load if missing, and the seed self-heals -- any previously-seeded `author: "system"` theme no longer in the current built-in list is deleted automatically. Custom admin-authored themes are never touched by this.

### `GET /themes`
Public. Returns all themes (built-in ones first) plus `defaultThemeId`.

### `GET /themes/:id`
Public. `404` if not found.

### `POST /themes`
Admin only (`401`/`403`). Body:
```json
{ "id": "...", "name": "...", "colorScheme": "...", "description": "...", "colors": { ... }, "postColors": { ... } }
```
`id`/`name`/`colorScheme` required. `409` on duplicate `id`.

### `PUT /themes/:id`
Admin only. `403` if the target is a built-in theme -- **built-ins are immutable**. Whitelisted fields: `name`, `description`, `colorScheme`, `colors`, `postColors`.

### `DELETE /themes/:id`
Admin only. `403` if built-in.

### `PATCH /themes/default`
Admin only. Body `{ themeId }` -- must reference an existing theme. Sets the `defaultTheme` setting.

## Push (`/push/*`)

### `POST /push/register`
Auth required. Body:
```json
{ "token": "...", "provider": "expo", "platform": "android" }
```
(`provider` defaults to `"expo"` -- the other accepted value is `"native"`; `platform` defaults to `"android"`, also accepts `"ios"`/`"web"`.)

Upserts **by token** -- one row per device. Re-registering the same token under a different user reassigns ownership, which is what makes device account-switching work correctly. `400` missing `token`.

### `POST /push/unregister`
Auth required. Body `{ token }`. Deletes the token row, scoped to the current user.

## Recommendations (`/recommendations`)

The public "Discover" surface -- see also [`project_recommendations_discover`](https://kowloon.network) internal notes if you're the server operator curating shelves via [`/admin/recommendations`](/docs/api/admin/#adminrecommendations--adminsections).

### `GET /recommendations`
Unauthenticated OK. Returns active `RecommendationSection`s in order, each resolved to its live, currently-visible items.

Curated `Recommendation` references are resolved against `Post` (via `FeedItems`), `Circle`, `Group`, `Bookmark`, `Page`, or `FederatedServer`. Items whose target was deleted, or whose visibility narrowed since curation, are **silently dropped** -- nothing about a recommendation is snapshotted except the tier it had at add-time; the live object is always the source of truth at read time.

Viewer-aware tiering matches [`/posts`](/docs/api/posts/)/[`/circles`](/docs/api/circles/) -- local-authenticated sees public+server, everyone else sees public only.

Sections with `source: "hybrid"` or `"heuristic"` and a `contentType` get algorithmic backfill (`getHeuristicPicks`) up to `targetCount`, excluding already-curated refs. Empty shelves (nothing curated and nothing to backfill) are omitted from the response entirely, rather than returned empty.

Media-type shelves get their first attachment's kind (image/video/audio) resolved and exposed as `mediaKind`/`mediaUrl` on each item.

Also returns a top-level `background` value (the `discoverBackground` setting) for the Discover page's backdrop.

```json
{
  "@context": "...",
  "type": "Collection",
  "background": "...",
  "sections": [
    { "id": "...", "name": "...", "slug": "...", "summary": "...", "contentType": "...", "source": "...", "targetCount": 10, "order": 0, "items": [ ... ] }
  ]
}
```

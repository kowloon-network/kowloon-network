---
title: Servers
description: /servers/* — the federation directory browser for known remote servers.
sidebar:
  order: 11
---

### `GET /servers`
Auth required — deliberately **not** open, to avoid unauthenticated requests triggering remote fetches. `401` otherwise.

Paginated list of known `FederatedServer` docs, excluding `suspended` ones — only servers that have actually been profiled. `?sort=name`, or default `discoveredAt desc`.

### `GET /servers/:domain`
Auth required. Returns the cached server profile, auto-refetching if stale (`fetchRemoteServerProfile`). `?refresh=true` forces a refetch regardless of staleness.

| Condition | Result |
|---|---|
| unreachable, nothing cached | `502` |
| unreachable, stale cache exists | returns the stale cache with `stale: true` |

Both routes defer browser navigations to the SPA.

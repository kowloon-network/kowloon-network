---
title: Search
description: /search -- local-only, consent-gated full-text and handle search.
sidebar:
  order: 10
---

### `GET /search?q=&searchIn=&page=&limit=`

Local-only search -- across content this server holds, whether original or already-federated in. `400` if `q` is missing.

`searchIn` accepts a comma-separated list from `posts,pages,users,groups,bookmarks,servers` (defaults to all).

**Handle-shaped queries bypass full-text search entirely**:
- `@user@domain` -- resolves the federated user/server directory directly (proxies to the remote server if not local).
- `@domain` -- resolves via the `FederatedServer` cache, matching by domain/name substring.

**Per-type consent gating**:

| Type | Rule |
|---|---|
| Post / Page / Bookmark | reuses `buildVisibilityQuery` (same tiering as their list endpoints) |
| User | always discoverable, minus blocked |
| Group | public, same-server, or member only |

Results across all types are merged, ranked by a `_score` -- real text relevance for full-text matches, or a fixed score (5 / 6 / 10 / 12) for handle/server matches -- then paginated.

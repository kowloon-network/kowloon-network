---
title: Undo
description: Inbound-only federated undo semantics.
sidebar:
  order: 9
---

Inbound-only -- no client SDK method sends this. It only ever arrives from a remote server's federation traffic.

Handles **inbound federated** undo semantics -- the generic ActivityPub-style undo. `activity.object` must be the full original activity being undone (an object, not just an ID):

```json
{
  "type": "Undo",
  "actorId": "@bob@remote.example",
  "object": { "type": "React", "to": "post:64f0...@kwln.org" }
}
```

Note the incoming AP payload's raw `actor` field is a URL (e.g. `https://remote.example/users/bob`) -- `normalizeInboundActivity()` converts it to `@bob@remote.example` before the activity ever reaches validation or a handler. See [Architecture](/docs/architecture/#addressing-to-canreply-canreact) for why `@user@domain` is the only legal actorId format, local or remote.

**Required**: `actorId`, `object` (must be present/truthy -- there's no shape check beyond that).

Only one case is implemented: `object.type === "React"` or `"Like"` -- a remote actor removed their reaction. Deletes the remote actor's React record for the target and recomputes react counts via the same recompute logic [React](/docs/activities/react/) uses.

Anything else -- including `Undo{Follow}`, which a remote server could still send even though Kowloon no longer creates follow relationships that way -- is acknowledged and logged, but no action is taken (`status: "ignored"`).

**Response**: `{ activity, result: { status }, federation: { shouldFederate: false } }` always -- `Undo` never re-federates.

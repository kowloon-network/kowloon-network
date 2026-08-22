---
title: "Moderation: Block, Unblock, Mute, Unmute"
description: Personal block and mute lists.
sidebar:
  order: 8
---

Four structurally identical handlers, each operating on the actor's own `circles.blocked` or `circles.muted` System circle.

```json
{ "type": "Block", "target": "@spammer@kwln.org" }
{ "type": "Unblock", "target": "@spammer@kwln.org" }
{ "type": "Mute", "target": "@annoying@kwln.org" }
{ "type": "Unmute", "target": "@annoying@kwln.org" }
```

**Required**: `actorId`, `target` (a resolvable actor/server ID). Self-block and self-mute are explicitly rejected (`"cannot block yourself"` / `"cannot mute yourself"`).

`target` accepts `@user@domain`, a bare `@domain` server handle, or any DB-resolvable ID.

:::note[Bare `@domain` gets special-cased on Unblock/Unmute]
`Unblock`/`Unmute` skip the normal actor lookup entirely for a bare `@domain` server ID and use the literal string as the member ID for the `$pull`. Going through the normal lookup for a single-`@` id would incorrectly resolve to the *server's own actor* rather than the domain being unblocked -- this is an explicit, in-code workaround, not an oversight.
:::

None of these four federate (`federate: false` always), and none create notifications.

## Response

`{ activity, circleId, blocked|unblocked|muted|unmuted: bool, federate: false }`.

## Client mapping

`block`/`unblock`/`mute`/`unmute` all match `{ type, objectType: "User", target: userId }` -- note `objectType` is sent by the client but unused by these handlers (they don't validate or dispatch on it). All four also call `this.moderation?.invalidate()` client-side to bust a local cache after success.

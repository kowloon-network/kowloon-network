---
title: Flag
description: Report content for moderation review.
sidebar:
  order: 10
---

Reports content for moderation.

```json
{
  "type": "Flag",
  "target": "post:64f0...@kwln.org",
  "object": { "reason": "spam", "notes": "posting the same link repeatedly" }
}
```

**Required**: `actorId`, `target` (a string), `object` (must be present β€” it carries `reason`).

## Reason resolution

`reason` is validated against a server-configured `Settings.flagOptions` map (`{ code: { label, description } }`). It accepts:

1. A direct code match.
2. A case-insensitive label match.
3. A fallback to the `"other"` code, with the raw input preserved as `details`, if `flagOptions.other` is configured.

If the server has no `flagOptions` configured at all, every `Flag` call errors with `"Flag: server flagOptions not configured"`.

## Dedup

Same actor + same target + same `reason.code` + an existing `status: "open"` Flag returns the existing flag (`duplicated: true`) rather than creating a new one.

`targetType`/`targetActorId` are resolved server-side via a best-effort lookup β€” `null` for unknown/remote targets, which also sets `federate: true` as a signal that the remote host may need to be told.

## Response

`{ activity, flag: <Flag doc>, federate: bool }`.

:::note[No `created`/`result`/`.federation` keys]
Unlike every other handler, the `Flag` response has no `created` or `result` key, and no nested `.federation` object β€” just a top-level `flag` and `federate` boolean. `routes/outbox/post.js` reads `created.federate` at the top level of the `createActivity()` return to decide whether to enqueue delivery, which does line up correctly with this shape β€” but if you're writing generic response-handling code across activity types, don't assume every handler returns a `result`/`federation` pair; `Flag` is the odd one out.
:::

## Client mapping

`flag({ targetId, reason, notes })` β†’ `{ type: "Flag", target: targetId, object: { reason, notes } }` β€” matches exactly.

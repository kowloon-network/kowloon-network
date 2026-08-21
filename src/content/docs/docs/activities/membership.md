---
title: "Membership: Join, Leave, Add, Remove"
description: Group RSVP flows and Circle membership management.
sidebar:
  order: 7
---

## Join

Operates on `Group` only.

```json
{ "type": "Join", "target": "group:64f0...@kwln.org" }
```

**Required**: `actorId`, `target` (a Group ID).

Approval behavior is driven by the Group's `rsvpPolicy`:

| Policy | Behavior |
|---|---|
| `open` | Joins immediately, added straight to the Members circle. |
| `serverOpen` | Local server members join freely; remote actors need approval. |
| `serverApproval` | Only local server members may join at all, and even they need approval. |
| `approvalOnly` | Everyone needs approval. |
| `inviteOnly` | **Nobody can self-join** β€” errors with `"Join: this group is invite-only"`. Admins must use `Add` to add members directly. |

The blocked-list check (against the group's `circles.blocked`) runs first, independent of policy.

The needs-approval path adds the actor to the group's `circles.pending` and notifies group admins (`join_request` notification, respecting each admin's `prefs.notifications.join_request`). The direct-join path adds to `circles.members`, bumps `Group.memberCount`, and adds the group to the joining user's own `circles.groups` System circle.

If the target Group isn't found locally (a remote group), the handler federates the raw `Join` activity to the group's host domain, and speculatively tracks the remote group in the user's `circles.groups` circle client-side, without any local membership state.

**Response**: `{ activity, created: { type: "Group", status }, result: same, federation }` β€” `status` is one of `pending` / `joined` / `already_joined` / `federated`.

**Client mapping**: `joinGroup({ groupId })` β†’ `{ type: "Join", objectType: "Group", target: groupId }`. `objectType` is sent but ignored β€” `Join` dispatch never uses it, since it only ever resolves `Group`.

## Leave

```json
{ "type": "Leave", "target": "group:64f0...@kwln.org" }
```

**Required**: `actorId`, `target`. Idempotent β€” pulls the actor from both `circles.members` and `circles.pending` in parallel, decrements `Group.memberCount` only if actually removed from `members`, and removes the group from the user's own `circles.groups`. If the group doc is remote (not found locally), returns `{ shouldFederate: true }` without mutating anything locally. Errors if the group is soft-deleted.

**Response**: `{ activity, created: { group, left: bool, removedFrom: [] }, result: same, federation }`.

**Client mapping**: `leaveGroup({ groupId })` matches exactly.

## Add / Remove

Adds or removes member(s) from a Circle. Both handlers share the same target-resolution logic and the same three-way auth switch.

### Two target syntaxes

```json
// "New" pattern β€” group-scoped, target circle optional (defaults to Members):
{ "type": "Add", "to": "group:64f0...@kwln.org", "object": "@bob@kwln.org" }

// Legacy pattern β€” explicit circle:
{ "type": "Add", "target": "circle:64f0...@kwln.org", "object": "@bob@kwln.org" }

// Batch add:
{ "type": "Add", "target": "circle:64f0...@kwln.org", "object": ["@bob@kwln.org", "@carol@kwln.org"] }

// Whole-server add (e.g. block/mute an entire domain, or follow a server):
{ "type": "Add", "target": "circle:64f0...@kwln.org", "object": "@spammy.example" }
```

`object` accepts a bare `@user@domain` string, a bare `@domain` server string, `{ actorId: "..." }`, or a full member/user object β€” resolved via `resolveActorToMember`, which for remote actors fetches their profile over HTTP and falls back to a minimally-constructed member if unreachable.

`Remove`'s `object` resolves to just an `{ id }` for the `$pull` β€” it accepts a bare string or `{ id }`/`{ actorId }`/a full object.

### Auth (by circle owner type)

Derived from `targetCircle.actorId`'s shape:

- **User-owned circle**: `activity.actorId` must equal the circle owner.
- **Server-owned circle**: must be a local-server circle; admin-only if it's the admin circle, mod-only if the mod circle (`isServerAdmin`/`isServerMod`).
- **Group-owned circle**: `isGroupAdmin(activity.actorId, targetCircle.actorId)`.

### Add β€” side effects

- Deduplicates against existing members before writing; `memberCount` is incremented by however many were actually new.
- User circles with the default icon adopt the first added member's icon (a "playlist-style" icon inheritance) β€” never overwrites a creator-chosen icon, never touches System circles.
- Adding to a Group's Members circle removes the member from `circles.pending` if present (fires a `join_approved` notification), and adds the group to the new member's own `circles.groups`.
- Newly-added **remote** members trigger an async best-effort content backfill (`pullFromRemote`, last 30 days) β€” skipped entirely if the target circle is the owner's Blocked or Muted circle, since pulling content from someone you're trying to keep out is pointless.
- User circles get their auto mosaic icon regenerated (fire-and-forget).

:::note[Mongoose array gotcha, documented in-code]
Federation recipients for remote members are carried via the returned `federation` object, deliberately *not* by overwriting `activity.to` with an array β€” `to` is a plain `String` on the Activity schema, and assigning an array of member IDs previously broke with a Mongoose cast error when adding two or more remote members at once.
:::

### Remove β€” side effects

For Group Members-circle removals, if the member isn't found in the target circle, the handler also tries the Pending circle β€” this covers rejecting a pending join request via `Remove` rather than a dedicated reject flow. User-circle removal also triggers mosaic-icon regeneration. `Remove` **never federates** (`federate: false` unconditionally).

### Response

`Add`: `{ activity, circleId, added: bool, addedCount, federate: bool, federation }`.
`Remove`: `{ activity, circleId, removed: bool, federate: false }`.

### Client mapping

`addToCircle({ circleId, memberId | memberIds | members })` and `removeFromCircle({ circleId, memberId })` match the legacy pattern. `approveJoinRequest({ groupId, userId })` β†’ `{ type: "Add", to: groupId, object: userId }` matches the "new" group-scoped pattern (no `target`, defaults to Members circle). `follow({ userId })` / `unfollow({ userId })` also go through these handlers rather than a dedicated Follow/Unfollow call β€” see [Federation](/docs/activities/federation/) for why real `Follow` activities are a separate, federation-only mechanism.

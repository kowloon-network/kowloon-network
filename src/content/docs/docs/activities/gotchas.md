---
title: Known Gotchas
description: Concrete mismatches and dead code in the Activity API, collected in one place.
sidebar:
  order: 11
---

Everything on this page is a real, verified mismatch or piece of dead code found by reading the actual handler and client source -- not a hypothetical. If you're debugging something that doesn't behave the way you'd expect from the type-by-type pages, check here first.

:::note[Fixed: Upload, deleteReact(), rejectJoinRequest() -- previously listed here as broken/dead]
Three issues that used to live on this page have been resolved in the codebase rather than just documented:

- **`Upload`** was dead code (unreachable via the schema) and has been removed entirely -- the handler no longer exists. Real file uploads go through `POST /files` (multipart/form-data), not `/outbox`; the client SDK agrees (`client.activities.upload()` delegates to `FilesClient.upload()`).
- **`deleteReact()`** always failed server-side validation and has been removed from the client SDK. Use `react({ postId, emoji: '' })` to clear a reaction -- see [React](/docs/activities/react/#clear-a-reaction).
- **`rejectJoinRequest()`** used to send a nonexistent `"Reject"` activity type. It now sends `{ type: "Remove", to: groupId, object: userId }`, which the server's `Remove` handler supports via its Pending-circle fallback -- see [Membership](/docs/activities/membership/#remove--side-effects).
- **Omitting `to`/`canReply`/`canReact` used to silently mean "visible to everyone on the server."** `routes/outbox/post.js` now defaults all three to the actor's own id instead of `""` -- see [the envelope docs above](#what-happens-before-validation) for why that makes the default actually private. Verified live: a post created without a `to` is now a `403` for a different authenticated same-server user, where it used to be a `200`.
:::

:::note[Removed: Follow/Unfollow/Accept]
Kowloon previously had a second, ActivityPub-native follow pipeline (`Follow`/`Unfollow`/`Accept` activity types, plus an `Undo{Follow}` case) alongside Circles, meant for interop with remote non-Kowloon actors. It was never reachable from any first-party client -- `follow()`/`unfollow()` have always sent `Add`/`Remove` against the Following circle -- and has been removed from the codebase entirely. **`Add` is the only follow mechanism now**; see [Architecture](/docs/architecture/#circles-replace-followfollowers).
:::

:::note[Removed: Announce]
`Announce` (remote boost/reshare) had a real, working handler, but Kowloon's actual reshare feature (both web and mobile) has always worked differently -- it creates a new `Link`-type post via `Create` that points back at the original (see [Create](/docs/activities/create/)), not a real ActivityPub `Announce`. Confirmed unused by any client, removed from the codebase (handler, and the `Announce` entries in both the `type` and `objectType` schema enums). [Undo](/docs/activities/undo/) now has its own page rather than sharing one with Announce.
:::

:::note[Fixed: actorId is always @user@domain now, no URL exception]
`activity.actorId` used to accept a raw `https://...` URL for remote AP actors, since `normalizeInboundActivity()` copied the incoming AP `actor` field straight through unconverted. Kowloon has no compatibility requirement to preserve that, so it's been tightened: the schema's `actorId` pattern no longer accepts URLs at all, and the normalizer now converts an inbound actor URL into `@username@domain` (extracting the username from the URL path, matching the same `.../users/username` convention Kowloon's own actor URLs use) before the activity ever reaches validation. The embedded object's `actorId` (from AP's `attributedTo`) gets the same conversion. Verified: `extractDomainFromUrl()`, `shouldFederate.js`'s `extractDomain()`, and `kowloonId()` already checked for `@`-prefixed handles before falling back to URL parsing, so nothing downstream needed to change to support this -- they were already built expecting it.
:::

:::note[The envelope's objectType enum is broader than any handler actually accepts]
`activity.schema.js`'s top-level `objectType` enum includes `"Delete"` as an allowed value, but neither `Create` nor `Update`'s internal `MODELS` map accepts it -- sending it passes AJV validation and then fails inside the handler with "unsupported objectType." Harmless, but don't treat the schema enum as a guarantee that a given `objectType` is meaningful for `Create`/`Update` specifically.
:::

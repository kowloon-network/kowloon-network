---
title: Known Gotchas
description: Concrete mismatches and dead code in the Activity API, collected in one place.
sidebar:
  order: 11
---

Everything on this page is a real, verified mismatch or piece of dead code found by reading the actual handler and client source β€” not a hypothetical. If you're debugging something that doesn't behave the way you'd expect from the type-by-type pages, check here first.

:::note[Fixed: Upload, deleteReact(), rejectJoinRequest() β€” previously listed here as broken/dead]
Three issues that used to live on this page have been resolved in the codebase rather than just documented:

- **`Upload`** was dead code (unreachable via the schema) and has been removed entirely β€” the handler no longer exists. Real file uploads go through `POST /files` (multipart/form-data), not `/outbox`; the client SDK agrees (`client.activities.upload()` delegates to `FilesClient.upload()`).
- **`deleteReact()`** always failed server-side validation and has been removed from the client SDK. Use `react({ postId, emoji: '' })` to clear a reaction β€” see [React](/docs/activities/react/#clear-a-reaction).
- **`rejectJoinRequest()`** used to send a nonexistent `"Reject"` activity type. It now sends `{ type: "Remove", to: groupId, object: userId }`, which the server's `Remove` handler supports via its Pending-circle fallback β€” see [Membership](/docs/activities/membership/#remove--side-effects).
:::

:::note[Removed: Follow/Unfollow/Accept]
Kowloon previously had a second, ActivityPub-native follow pipeline (`Follow`/`Unfollow`/`Accept` activity types, plus an `Undo{Follow}` case) alongside Circles, meant for interop with remote non-Kowloon actors. It was never reachable from any first-party client β€” `follow()`/`unfollow()` have always sent `Add`/`Remove` against the Following circle β€” and has been removed from the codebase entirely. **`Add` is the only follow mechanism now**; see [Architecture](/docs/architecture/#circles-replace-followfollowers).
:::

:::note[The envelope's objectType enum is broader than any handler actually accepts]
`activity.schema.js`'s top-level `objectType` enum includes `"Announce"` and `"Delete"` as allowed values, but neither `Create` nor `Update`'s internal `MODELS` map accepts either β€” sending one passes AJV validation and then fails inside the handler with "unsupported objectType." Harmless, but don't treat the schema enum as a guarantee that a given `objectType` is meaningful for `Create`/`Update` specifically.
:::

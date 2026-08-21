---
title: Known Gotchas
description: Concrete mismatches and dead code in the Activity API, collected in one place.
sidebar:
  order: 11
---

Everything on this page is a real, verified mismatch or piece of dead code found by reading the actual handler and client source β€” not a hypothetical. If you're debugging something that doesn't behave the way you'd expect from the type-by-type pages, check here first.

:::danger[Upload is not a real outbox activity type]
`ActivityParser/handlers/Upload/index.js` exists, is well-formed, and is auto-wired into the dispatcher (`ActivityParser/index.js` registers any directory under `handlers/` that default-exports a function β€” directory presence alone is enough). **But `activity.schema.js`'s `type` enum does not include `"Upload"`.** Every `POST /outbox` call runs AJV validation before the dispatcher is ever consulted, so `{ "type": "Upload", ... }` is rejected outright with a schema enum-mismatch error β€” the handler code is unreachable.

Real file uploads go through a completely separate path: `POST /files` (multipart/form-data), which validates/re-encodes the binary, uploads to the storage adapter, and creates a `File` document directly β€” no Activity envelope, no `ActivityParser` involvement at all. The client SDK agrees: `client.activities.upload(options)` delegates straight to `FilesClient.upload()` (`POST /files`), never touching `/outbox`.

**Don't document or rely on `Upload` as a real outbox activity type.**
:::

:::danger[deleteReact() is broken]
`ActivitiesClient.deleteReact({ reactId })` sends:

```json
{ "type": "Undo", "objectType": "React", "target": reactId }
```

`Undo`'s handler requires `activity.object` (the full activity being undone, not just a target ID) and has no code path that reads `target` at all β€” its `validate()` returns `"Undo: missing object (the activity being undone)"` whenever `object` is absent. Since `deleteReact()` sends only `target`, **this call always fails server-side validation.**

The working equivalent is `react({ postId, emoji: '' })` β€” see [React](/docs/activities/react/#clear-a-reaction). `deleteReact()` appears to be dead client code left over from before the current single-reaction React model.
:::

:::danger[rejectJoinRequest() sends a nonexistent activity type]
`ActivitiesClient.rejectJoinRequest()` sends `{ type: "Reject", to: groupId, object: userId }`. `"Reject"` is not in the schema's `type` enum, and there is no `handlers/Reject/` directory β€” this call always fails AJV validation before it reaches any dispatcher.

There is no implemented server-side "reject a pending group join request" activity at all. `Remove` against a Group's Pending circle appears to be the closest working substitute β€” [Add/Remove's fallback-to-pending logic](/docs/activities/membership/#remove--side-effects) already checks the Pending circle when a member isn't found in Members β€” but no client method currently calls `Remove` that way for this purpose.
:::

:::caution[Follow/Unfollow/Accept are fully implemented but unreachable from any first-party client method]
See [Federation](/docs/activities/federation/) for the full picture. Short version: the server maintains a real, separate ActivityPub-style follow pipeline for remote-actor interop β€” including an ad-hoc "Followers" System circle that isn't one of the five documented ones β€” but no client SDK method sends `Follow` or `Unfollow`. The client's own `follow()`/`unfollow()` send `Add`/`Remove` against the Following circle instead. If you need real two-way AP follow semantics with a non-Kowloon server, you have to construct `Follow`/`Unfollow` activities by hand.
:::

:::note[The envelope's objectType enum is broader than any handler actually accepts]
`activity.schema.js`'s top-level `objectType` enum includes `"Announce"` and `"Delete"` as allowed values, but neither `Create` nor `Update`'s internal `MODELS` map accepts either β€” sending one passes AJV validation and then fails inside the handler with "unsupported objectType." Harmless, but don't treat the schema enum as a guarantee that a given `objectType` is meaningful for `Create`/`Update` specifically.
:::

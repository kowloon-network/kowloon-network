---
title: React
description: Set, replace, or clear a single reaction.
sidebar:
  order: 6
---

`React` is a separate model with its own self-contained handler, following the same pattern as `Reply`. Kowloon uses a **one reaction per user per target** model: a `React` activity sets it (creating or replacing whatever was there), and an emoji-less payload clears it. There is no separate "unreact" activity type -- clearing is just `React` with no emoji.

## Set or replace a reaction

```json
{
  "type": "React",
  "objectType": "React",
  "to": "post:64f0...@kwln.org",
  "object": { "type": "React", "emoji": "thumbsup", "name": "thumbsup" }
}
```

## Clear a reaction

```json
{
  "type": "React",
  "objectType": "React",
  "to": "post:64f0...@kwln.org",
  "object": { "emoji": "" }
}
```

:::caution[The emoji field has a three-way fallback -- omit `object.type` when clearing]
The handler reads the emoji value as `object.react || object.emoji || object.type` -- a three-way fallback. `object.type` is deliberately **optional** on a clear payload specifically so a populated `object.type` isn't misread as the emoji value. The schema allows `object.type` to be absent on `React`, but if present it must equal `"React"`. If you send `object.type: "React"` alongside an empty `emoji` intending to clear, that's fine -- but never rely on `object.type` carrying an emoji value, and match the client SDK's own behavior (below) of omitting `type` entirely on a clear payload.
:::

**Required**: `actorId`, `objectType` (a string), `object` (an object), `to` (the target ID -- despite the schema calling it `to`, semantically this is the reaction *target*, not an audience).

**Targets supported**: `Post`, `Reply`, `Page`, `Bookmark`, `Group`, `Circle`.

## Auth

Only gated on new/changed reactions -- clearing your own past reaction is never blocked, even if you've since been blocked (you can always clean up your own data). The gate (`authorizeInteraction(..., capability: "canReact")`) is currently only enforced for `Post`/`Reply` targets, checked against the **root** post for Reply targets. `Page`/`Bookmark`/`Group`/`Circle` react targets aren't `FeedItems`-backed and skip this gate -- a tracked follow-up, [kowloon#40](https://github.com/kowloon-network).

## Side effects

- `reactCount`/`reactPreview` (top emoji)/`reactSummary` (all distinct emoji, concatenated) are **recomputed from a live aggregate** over the `React` collection -- never incremented/decremented by delta -- and written to whichever target model matches, plus its `FeedItems` cache entry. Recompute-not-delta is what keeps counts correct across add/replace/clear without needing to track prior state.
- `User.reactCount` (the *actor's* own tally of things they've reacted to) is incremented on a brand-new reaction, decremented on clear, and left untouched on a replace.
- A notification fires **only** on a brand-new reaction -- never on replace or clear -- respecting `prefs.notifications.react`.
- Federation goes to the target's host, the target author's home, and -- for Reply targets -- the parent's host too.

## Response

`{ activity, created: { status, react }, result: same, federation }`, where `status` is one of `reacted` / `replaced` / `unreacted` / `already_reacted` / `no_change`.

## Client mapping

`react({ postId, emoji, name })` matches exactly, including the deliberate `object.type` omission on clear. There is no separate `deleteReact()` method -- it used to exist but always failed server-side validation, and has been removed; `react({ postId, emoji: '' })` is the only (and correct) way to clear a reaction.

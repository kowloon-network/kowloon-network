---
title: Embeds
description: The shared link-embed recognizer used by the server, web, and mobile.
sidebar:
  order: 7
---

`@kowloon/client/embeds` is a pure, client-side registry -- no HTTP calls of its own. It's the single, shared recognizer for "what's embeddable" -- the exact same code is used by the server's `/preview` endpoint, the web frontend, and the mobile app, so the definition of what gets rendered as a rich embed versus a plain link lives in exactly one audited place rather than being reimplemented three times.

## `resolveEmbed(url)`

```js
import { resolveEmbed, isEmbeddable } from '@kowloon/client/embeds'

const embed = resolveEmbed(url)
// { provider, mode: 'inline' | 'linkout', embedUrl?, thumbnail?, aspectRatio, title?, allow?, sandbox? }
// or null if the URL isn't recognized by any provider
```

`aspectRatio` defaults to `16/9` if the provider doesn't specify one. A `null` result means: render this as a plain link, not an embed.

`isEmbeddable(url)` is a boolean convenience wrapper over the same check.

## Providers

Only `youtube` is registered today. The YouTube provider recognizes a broad set of URL shapes:

- `youtube.com/watch?v=...`
- `youtu.be/...`
- `/shorts/...`
- `/embed/...`
- `/live/...`
- `/v/...`
- `music.youtube.com/...`

It also parses `t`/`start` query params into a playback start offset, accepting several formats: `90` (bare seconds), `90s`, `1m30s`, `1h2m3s`.

:::note[Security note worth keeping in mind]
The video id is validated against a strict 11-character regex before it's used to build the iframe `src`, and the embed points at `youtube-nocookie.com` (YouTube's privacy-preserving embed host). User input never reaches the iframe `src` beyond that whitelisted, regex-validated id -- this is a deliberate hardening choice, not an incidental detail.
:::

`EMBED_WEBVIEW_USER_AGENT` is also exported -- a spoofed desktop-Chrome user-agent string. Android's native WebView identifies itself with a `"wv"` token in its user agent, and YouTube specifically rejects playback for that token ("video unavailable"). Mobile embeds need to send this spoofed UA to work at all; the web frontend doesn't need it since it's already running in a real browser.

## Adding a provider

Drop a new file under `providers/` exporting `{ name, hosts, match(url), embed(match) }`, and register it in the `PROVIDERS` list. `match()` determines whether a URL belongs to this provider (and extracts whatever `embed()` needs); `embed()` builds the final descriptor.

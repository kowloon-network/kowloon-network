---
title: Client Library Overview
description: Getting started with @kowloon/client -- an isomorphic JavaScript client for the Kowloon API.
sidebar:
  order: 0
---

`@kowloon/client` is an isomorphic JavaScript client for the Kowloon API. The same package runs unmodified in Node, in the browser, and inside a React Native app -- it detects its environment and picks the right storage backend automatically.

```sh
npm install @kowloon/client
```

## Package exports

Besides the default export, the package publishes several subpath exports for consumers who only want a slice of the client:

```
@kowloon/client
@kowloon/client/auth
@kowloon/client/activities
@kowloon/client/feed
@kowloon/client/search
@kowloon/client/admin
@kowloon/client/embeds
@kowloon/client/theme/palette.json
```

Most apps just use the default export and reach everything through one instance.

## Creating a client

```js
import KowloonClient from '@kowloon/client'

const client = new KowloonClient({
  baseUrl: 'https://kwln.social',
  storage,        // optional -- auto-detected if omitted
  headers,        // optional -- extra headers merged into every request
  timeout,        // optional -- request timeout in ms
  onUnauthorized, // optional -- see below
})

await client.init()
```

`baseUrl` is **required**. If it's missing, the constructor throws a plain `Error` (not a `KowloonError` subclass -- the distinction matters if you're pattern-matching on the error hierarchy below).

`client.init()` calls `auth.restoreSession()` internally, which attempts to load a persisted token and refresh the user's session (see [Auth](/docs/client/auth/)). Always await it before assuming `client.auth.getUser()` reflects reality.

### Storage auto-detection

If you don't pass a `storage` adapter explicitly, `detectStorage()` picks one for you:

1. **React Native** (`global.navigator.product === 'ReactNative'`) -- an `AsyncStorageAdapter` wrapping `@react-native-async-storage/async-storage`, loaded dynamically via `require`. If that package isn't installed, it falls back to an in-memory store with a console warning rather than throwing.
2. **Browser** (`window.localStorage` present) -- a `LocalStorageAdapter`.
3. **Node** (neither of the above) -- an in-memory `Map`-backed store. Sessions do **not** survive process restarts under this default -- pass your own persistent adapter if you need that in a Node context (a CLI tool, a server-to-server integration, etc.).

All adapters expose the same async shape: `{ getItem, setItem, removeItem, clear }`, and all swallow their own internal errors (logging to `console.error` and falling back safely) rather than throwing out of the client.

## Sub-clients

A `KowloonClient` instance wires up one sub-client per API area. Construction order matters internally -- `moderation` and `files` are built *before* `activities`, because `ActivitiesClient` delegates file uploads to `FilesClient` and invalidates `ModerationClient`'s cache after block/mute actions -- but as a consumer you don't need to think about that; just use `client.<name>`.

| Sub-client | Purpose |
|---|---|
| [`auth`](/docs/client/auth/) | Register, log in/out, session restore, token access. |
| [`activities`](/docs/client/activities/) | Every write operation -- posts, replies, reacts, circles, groups, bookmarks, pages, profile, follow/block/mute, flags. Funnels through `POST /outbox`. |
| [`feeds`](/docs/client/feed/) | Every read operation -- timelines, single-object lookups, listings, search-adjacent lookups. |
| [`files`](/docs/client/files/) | Upload, list, inspect, delete, and build serving URLs for uploaded files. |
| [`notifications`](/docs/client/notifications-search-themes/) | List, count, and mark notifications read/dismissed. |
| [`search`](/docs/client/notifications-search-themes/) | Full-text and handle-shaped search across the server. |
| [`admin`](/docs/client/admin/) | Server-admin CRUD surface. Also reachable via the `@kowloon/client/admin` subpath export, but it's wired onto every normal instance too -- see the note below. |
| [`moderation`](/docs/client/moderation/) | Client-side block/mute filtering for content fetched anonymously from other servers. |
| [`themes`](/docs/client/notifications-search-themes/) | List/read themes publicly; create/update/delete/set-default as an admin. |

Plus a few plain modules re-exported from the package root rather than instantiated as sub-clients:

- [`embeds`](/docs/client/embeds/) -- the shared link-embed recognizer (YouTube, etc.).
- [`prefs/manifest.js` and `prefs/pins.js`](/docs/client/prefs/) -- the shared preferences schema and feed-pin helpers used by both the web and mobile settings UIs.

:::note[Correction to earlier internal docs]
The client's own `CLAUDE.md` module list has drifted from the real package -- it omits `embeds/`, `moderation/`, `prefs/manifest.js`, `prefs/pins.js`, and `themes/` entirely, and its claim that admin is "a separate package export only" is incomplete: `client.admin` is also wired onto every normal `KowloonClient` instance. Both access paths work; this page and the admin page describe the real, current surface.
:::

## `onUnauthorized`

If you pass an `onUnauthorized` callback, it fires when the server responds `401` to a request that **itself carried an `Authorization` header**. A `401` on a request that was never authenticated in the first place (you simply aren't logged in) does not trigger it. This distinction lets you use `onUnauthorized` specifically to detect "your session just expired / was revoked" and prompt a re-login, without it firing spuriously on ordinary anonymous browsing.

## Error hierarchy

Every HTTP-level failure is normalized into one error hierarchy, rooted at `KowloonError`:

```
KowloonError            (base -- has statusCode, response, requestId)
|---- AuthenticationError  (401)
|---- AuthorizationError   (403)
|---- NotFoundError        (404)
|---- ValidationError      (400, and the general 400--499 fallback -- has an `.errors` array)
|---- ServerError          (5xx)
`---- NetworkError          (client-side connectivity failure -- timeout/abort/DNS; no fixed status)
```

`createErrorFromStatus(status, message, options)` is the single function that maps an HTTP status to the right subclass, so you can rely on this hierarchy holding consistently across every sub-client -- with one exception:

:::caution[Multipart requests bypass the normal error path]
`FilesClient.upload()`, `AdminClient.restoreFromFile()`, and a couple of other multipart-body calls skip `HttpClient` entirely and call `fetch()` directly (`HttpClient` always JSON-stringifies its body, which doesn't work for `FormData`). Failures from these calls are not guaranteed to arrive as `KowloonError` subclasses -- check for a plain `Error` too if you're handling errors from an upload or restore call. See the [gotchas page](/docs/client/gotchas/) for the full list.
:::

## The "options object" convention -- mostly

Most methods across the library take a single options object: `client.activities.createPost({ content, to })` rather than positional arguments. This is a deliberate, library-wide convention -- but it is **not universal**. A handful of methods (mostly on `FilesClient` and `NotificationsClient`) take a bare ID string instead. See the [gotchas page](/docs/client/gotchas/) for the exact list before you assume every call follows the same shape.

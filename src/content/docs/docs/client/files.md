---
title: FilesClient
description: Upload, list, inspect, delete, and build serving URLs for uploaded files.
sidebar:
  order: 4
---

`client.files` handles binary uploads and file metadata. It's used both directly (attach a file to something) and indirectly (`client.activities.upload()` delegates straight to it).

## `upload(options)`

```js
await client.files.upload({
  file,             // Blob or Node Buffer
  filename,
  contentType,
  title, summary,
  to,
  parentObject,     // the file inherits this object's visibility at serve time
  generateThumbnail,
  thumbnailSizes,
})
```

`upload()` builds a `FormData` payload by hand, handling both browser `Blob` inputs and Node `Buffer` inputs. It **bypasses `HttpClient` entirely** and calls `fetch()` directly, because `HttpClient` always JSON-stringifies its request body -- which doesn't work for multipart form data -- and manually attaches the bearer token to the raw request instead of going through `HttpClient`'s normal header-building path.

:::caution
Because this call skips `HttpClient`, a failed upload doesn't reliably surface as a `KowloonError` subclass the way most other failures do. See the [gotchas page](/docs/client/gotchas/).
:::

## `list`, `getMeta`, `delete`

```js
client.files.list({ type, page, limit })
client.files.getMeta(fileId)   // bare string, not an options object
client.files.delete(fileId)    // bare string, not an options object
```

:::caution[Convention break]
`getMeta` and `delete` take a **bare `fileId` string**, not an options object like almost everything else in the library. `list` does take an options object. This inconsistency is real, not a typo in these docs -- check the exact signature before wiring a call.
:::

## `serveUrl(fileId, options)`

```js
client.files.serveUrl(fileId, { size, token })
```

This is a pure URL builder -- it does not make an HTTP request. It returns the `/files/:id` proxy URL a browser or app can point an `<img>`/`<video>`/download link at directly. `size` requests a specific thumbnail variant. `token` exists specifically for contexts where you can't set request headers (like an `<img src>` attribute) -- it lets you authenticate the file request via a query parameter instead of an `Authorization` header.

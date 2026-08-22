---
title: Files
description: /files/* -- upload, metadata, the streaming proxy, and visibility inheritance.
sidebar:
  order: 8
---

Storage is never exposed directly -- `GET /files/:id` is the **only** public URL surface for any uploaded file, always proxied through the app.

### `GET /files`
Auth required. Lists **the authenticated user's own files only** (`actorId: user.id`) -- there is no endpoint to list another user's files.

Query params: `?type=Image|Video|Audio|Document`, `?page`, `?limit` (max 100).

Built on `makeCollection()`, so it returns the standard ActivityStreams `OrderedCollection`/`OrderedCollectionPage` shape (see [REST API Overview](/docs/api/overview/#pagination--collection-responses)) -- items are under `orderedItems`, not a bespoke `files` key.

### `POST /files` (alias: `POST /files/upload`)
Auth required. `multipart/form-data`, field name `file`.

**Size limit**: resolved dynamically per-request from `settings.maxUploadSize` (MB) or the `MAX_UPLOAD_SIZE` env, default 50MB. Oversized upload -> `413`.

**Other body fields**:

| Field | Notes |
|---|---|
| `title`, `summary` | optional metadata |
| `thumbnailSizes` | JSON array string, default `[200,400]` |
| `generateThumbnail` | pass the string `"false"` to opt out |
| `parentObject` | Kowloon ID whose visibility this file inherits -- see below |
| `to` | canonicalized via `canonicalTo` |
| `actorId` | admin-only override to upload on someone else's behalf; `403` for non-admins |

Validation: MIME type + magic-byte sniffing + SVG sanitization (`validateUpload`) -- `415` on failure. Raster images get EXIF auto-orient applied and are capped to a 2048px long edge. Video types needing MP4 faststart (`video/mp4`, `video/quicktime`, `video/x-m4v`) get an async `MediaJob` queued (`processingStatus: "pending"` in the response until it completes).

Storage is always private regardless of the requested `to` -- the response gives the app-proxied URL, never a direct storage URL.

Response:
```json
{ "file": { "id": "...", "url": "...", "thumbnails": { ... }, "processingStatus": "...", "metadata": { ... } } }
```

### `GET /files/:id/meta`
File metadata.

:::danger[No visibility check at all -- tracked as kowloon-network/kowloon#45]
Unlike `GET /files/:id` (the streaming proxy, below), this route has **no auth check and no visibility check whatsoever** -- it looks the file up by id and returns its metadata unconditionally. Worse, `?signed=true` will mint a working signed URL for a fully restricted file with no access check either. Treat this as a known open vulnerability, not just an inconsistency, until [#45](https://github.com/kowloon-network/kowloon/issues/45) is fixed.
:::

`?signed=true&expiresIn=<sec>` also returns a short-lived `signedUrl` in the response. `404` if not found.

### `GET /files/:id` (streaming proxy)
The authenticated streaming proxy -- the actual file bytes flow through this route. Optional `?size=<n>` requests a specific thumbnail variant.

**Visibility resolution** -- the key rule to understand:
```
effectiveTo = parentObject's live `to` field, if the file has one, otherwise the file's own `to`, otherwise "@public"
```
The parent object's **current, live** `to` takes precedence over whatever the file's own `to` was set to at upload time. If you tighten a post's visibility after the fact, its attached images automatically become just as restricted -- you don't need to update each file separately.

**Auth**, any one of:
- `Authorization: Bearer|Token|JWT <jwt>`
- a signed `?exp=&sig=` query pair (app-issued, bypasses the JWT check entirely -- this is what makes `<img>` tags work without custom headers)
- `?token=` (legacy query param)

`401` / `403` / `404` per the standard visibility rules. Supports HTTP Range requests for video/audio streaming (`206 Partial Content`).

`Cache-Control` differs by visibility: `public, max-age=300` for public files, `private, max-age=60` for restricted ones.

### `DELETE /files/:id`
Owner or server admin only (`403` otherwise). Deletes from the storage backend first -- **non-fatal if that fails** (logged, but the soft-delete proceeds regardless) -- then soft-deletes the DB record (`deletedAt`).

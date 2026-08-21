---
title: Notifications, Search & Themes
description: NotificationsClient, SearchClient, and ThemesClient.
sidebar:
  order: 5
---

Three smaller sub-clients, grouped together here since each has a compact surface.

## NotificationsClient (`client.notifications`)

```js
client.notifications.list({ types, unread, limit, offset })
client.notifications.unreadCount({ types })
client.notifications.markRead(id)      // bare string
client.notifications.markUnread(id)    // bare string
client.notifications.markAllRead({ types })
client.notifications.dismiss(id)       // bare string
```

:::caution[Convention break]
`markRead`, `markUnread`, and `dismiss` take a **bare notification id string**, not an options object — the same exception pattern as `FilesClient.getMeta`/`.delete`. `list`, `unreadCount`, and `markAllRead` do take options objects.
:::

## SearchClient (`client.search`)

```js
client.search.search({ query, page, type, since, searchIn })
```

`searchIn` is an object of booleans — `{ posts, pages, groups, users, bookmarks, servers }` — flattened internally into a comma-joined `searchIn` query param before the request goes out. Convenience wrappers pre-fill it for you:

```js
client.search.searchPosts({ query })
client.search.searchGroups({ query })
client.search.searchUsers({ query })
client.search.searchBookmarks({ query })
client.search.searchPages({ query })
client.search.searchServers({ query })
```

:::note[`searchServers` is local-cache only]
`searchServers` searches this server's own `FederatedServer` cache — it does **not** crawl the live network. For a live, on-demand lookup of a specific domain, use `client.feeds.getServer({ domain })` instead, which fetches fresh (with staleness-based refetching) rather than only checking the cache.
:::

## ThemesClient (`client.themes`)

```js
client.themes.list()          // public, no auth
client.themes.getById(id)     // public, no auth

client.themes.create(theme)          // admin only
client.themes.update(id, updates)    // admin only
client.themes.delete(id)             // admin only
client.themes.setDefault(themeId)    // admin only
```

Theme shape: `{ id, name, description, colorScheme, colors, postColors }`. Built-in themes (`system`, `kowloon-light`, `kowloon-dark`) are seeded server-side and can't be edited or deleted even by an admin — see the [REST API admin docs](/docs/api/admin/) for the server-side enforcement.

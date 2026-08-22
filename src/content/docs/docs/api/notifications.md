---
title: Notifications
description: /notifications/* -- the self-resolving alias for the current user's notifications.
sidebar:
  order: 9
---

A standalone, self-resolving alias: resolves the authenticated user from the JWT rather than requiring an `:id` in the path. Auth required on every route (`401` otherwise).

Route set and response shapes are **identical** to [`/users/:id/notifications/*`](/docs/api/users/#notifications-sub-router-usersidnotifications) -- this page just documents the shorter, self-addressed form most clients should default to using:

- `GET /` -- paginated, `?types=`, `?unread=true`
- `GET /unread/count` -- `{ count }`
- `POST /:notifId/read`
- `POST /:notifId/unread`
- `POST /read-all` (`?types=`)
- `POST /:notifId/dismiss`

Use `/users/:id/notifications/*` only if you already have the user's ID in hand and want to avoid a JWT round-trip lookup -- otherwise prefer this alias.

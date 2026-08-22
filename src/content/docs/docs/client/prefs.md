---
title: Preferences & Pins
description: The shared preferences manifest and feed-pin helpers used by both the web and mobile settings UIs.
sidebar:
  order: 8
---

## Preferences manifest (`prefs/manifest.js`)

This file is pure data -- no React, no platform-specific imports -- and it's the single source of truth both the web and mobile settings screens iterate over to render their preference UIs. Add a preference here once, and both apps get a UI for it.

```js
import { PREF_GROUPS, PREFS, getPrefValue } from '@kowloon/client/prefs/manifest'
```

`PREF_GROUPS` is a fixed set of sections: `general`, `composing`, `feed`, `notifications`.

`PREFS` is an array of entries, each shaped:

```js
{
  key,        // dot-path into user.prefs, e.g. "notifications.mention"
  group,      // one of PREF_GROUPS
  type,       // 'toggle' | 'select' | 'multiselect' | 'audience' | 'timezone'
  label,
  hint,       // optional
  options,    // for select/multiselect
  default,
  adminOnly,  // optional
}
```

Preference values live **flat** on `user.prefs[key]` (using the dot-path for nested keys) -- never wrapped in a `{ label, value }` shape. `getPrefValue(prefs, entry)` reads a dot-pathed value out of a `prefs` object, falling back to the entry's `default` if unset.

### Why some prefs are deliberately absent

The manifest documents (and this is worth preserving, since it heads off "why isn't there a setting for X" questions) why a few obvious-seeming preferences don't exist:

- **`timezone`** -- dates render in the viewer's local timezone automatically via `Intl`, so there's nothing to configure.
- **`theme`** (dark mode) -- mobile doesn't have dark mode support yet, so this isn't offered as a preference there.
- **`lang`** -- auto-detected from the OS, with a reserved slot for a future manual override.
- **`"follow"` notifications** -- Kowloon never notifies anyone when they're added to someone's circle, by design (matches the project's broader "no follow notifications" convention). There's no preference for this because there's no notification to toggle.

## Pins (`prefs/pins.js`)

Pure array helpers, no server calls, shared by web and mobile for the feed-selector's pin-to-top feature:

```js
import { pin, unpin, togglePin, isPinned, sortByPins } from '@kowloon/client/prefs/pins'

const pinned = pin(pinnedList, id)
sortByPins(items, pinned)   // stable-sorts pinned items to the front, in pinned order; leaves the rest in place
```

These are plain local-array operations -- persisting a change is a separate step, via [`client.activities.setPins({ circles, groups })`](/docs/client/activities/), which writes the full ordered pin arrays to the user's profile.

---
title: Upgrading Kowloon
description: Moving your server to a new release -- reading the notes, taking a backup, changing the version, and going back if you need to.
sidebar:
  order: 3
---

Your server runs one exact version of Kowloon, the one you installed, and stays on it until you choose to move. Nothing updates itself. That means you decide when an upgrade happens, and you can pick a quiet moment and read what's changed first.

An upgrade takes a few minutes. Your site is unavailable for a few seconds while it restarts.

## Before you start: read the release notes

Every release is described in the **[changelog](https://github.com/kowloon-network/kowloon/blob/main/CHANGELOG.md)**, written for people who run servers. Releases are also listed, with the same notes, on the [releases page](https://github.com/kowloon-network/kowloon/releases).

Read every entry between the version you're on and the one you're moving to. Look especially for a **Before you upgrade** section: until Kowloon reaches 1.0, a new minor version (0.9 to 0.10, say) can need you to do something by hand, and when it does, it's listed there.

Not sure which version you're on? Look at the `image:` lines in `docker-compose.yml` in your install folder:

```bash
cd ~/kowloon
grep image: docker-compose.yml
```

The app's lines end with the version, for example `ghcr.io/kowloon-network/kowloon:0.9.0`.

## 1. Take a backup

In the admin panel, go to **Settings -> Maintenance** and choose **Back up everything**. Wait until it finishes -- it appears in the list with its size, and you'll get an email if email is set up -- then download it with its download button and keep it somewhere other than the server.

This is your way back if the upgrade goes wrong. Don't skip it.

## 2. Change the version

Open `docker-compose.yml` in your install folder in a text editor (`nano docker-compose.yml` is the easy one). Five services use the Kowloon app image:

- `app` (on a [second server sharing a machine](/docs/admin/install/#running-a-second-server-on-the-same-machine), it's named after the domain instead, like `app-social-example-com`)
- `worker-outbox`
- `worker-pull`
- `worker-media`
- `worker-backup`

Change the version at the end of **every one** of those `image:` lines. They must all match: the workers share the app's database, and two versions working on the same data at once is asking for trouble. For example, to move from 0.9.0 to 0.9.1:

```yaml
    image: ghcr.io/kowloon-network/kowloon:0.9.1
```

Or change them all at once:

```bash
sed -i 's|ghcr.io/kowloon-network/kowloon:[^ ]*|ghcr.io/kowloon-network/kowloon:0.9.1|' docker-compose.yml
grep image: docker-compose.yml
```

Check the `grep` output: each of the five lines should show the new version. The other images -- `mongo`, `minio/minio`, `minio/mc` and `caddy` -- are left as they are.

## 3. Download and restart

```bash
docker compose pull
docker compose up -d
```

The first command downloads the new version; the second restarts everything that changed.

## 4. Check it

Open `https://your-domain/health` or run `curl https://your-domain/health`. Give it a minute after restarting, then you should see `"status":"ok"`. If you see `degraded`, a background worker hasn't started; `docker compose ps` and `docker compose logs` will show you which and why. (The [installation guide](/docs/admin/install/#checking-that-its-healthy) explains the health page in full.)

Then sign in and look around: open your feed, make a post, check the admin panel.

## If something goes wrong: going back

Going back to the previous version is the same as going forward: put the old version back on all five `image:` lines, then `docker compose pull` and `docker compose up -d`.

That's usually enough. But a newer version can change how data is stored, and there's no promise that an older version understands data a newer one has written. If the old version misbehaves after you go back, restore the backup you took in step 1: **Settings -> Maintenance -> Restore from a backup**, then `docker compose restart` once it has finished so the server picks up the restored settings. (For archives over 512 MB, use the command-line restore described in [Recovering from a lost server](/docs/admin/restore/#3-restore-the-backup).) That returns your server to exactly how it was before the upgrade -- which also means anything posted since is lost, so decide quickly.

If you're stuck, open an issue on [GitHub](https://github.com/kowloon-network/kowloon/issues) with what the changelog said, what you did, and what `docker compose logs` shows.

## Choosing how closely to follow releases

Each release is published under several names, and the one in your `image:` lines decides what `docker compose pull` fetches:

- **An exact version**, such as `0.9.1` -- never changes. This is what the installer sets, and the safest choice: you only ever move when you edit the file.
- **A minor version**, such as `0.9` -- always the newest `0.9.x`. With this, `docker compose pull && docker compose up -d` picks up bug-fix releases without editing anything, but you won't notice when one arrives unless you read the changelog.
- **`stable`** -- the newest release of any kind, including ones with **Before you upgrade** steps. Not recommended: it can move you to a new minor version without warning.
- **`latest`** -- the development version, rebuilt every time a change lands on the main branch. Untested. Don't use it for a community people rely on.

Test versions published ahead of a release (`0.9.0-rc.1`, say) only ever appear under their own exact name.

## Servers installed before 0.9.0

Servers installed before versioned releases follow `latest`, or an old image name, `ghcr.io/jzellis/kowloon:latest`, that no longer receives updates. Moving to a release takes one by-hand step, described in the changelog under **0.9.0 -> Before you upgrade**.

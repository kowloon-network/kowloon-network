---
title: Recovering from a lost server
description: What survives if the machine your server runs on dies, how to keep a copy that does, and how to bring your community back on a new machine.
sidebar:
  order: 4
---

Machines fail. Disks die, hosting companies close accounts, someone deletes the wrong thing. This page is about the worst case -- the server itself is gone -- and it's worth reading now, while everything is fine, because the most important step has to happen before anything goes wrong.

## Where your backups actually are

The backups you make in **Settings -> Maintenance**, by hand or automatically, are stored **on the same machine as your server**, in its own file storage, next to your members' photos.

That protects you from a lot: a bad upgrade, an accidental deletion, a corrupted database. It does **not** protect you from losing the machine. If the server's disk dies or the machine is deleted, every backup on it goes too.

The only backup that survives losing the machine is one you've copied somewhere else.

## Keep a copy somewhere else

You need two things stored away from the server:

- **A recent "everything" backup.** A backup of the database alone brings back accounts, posts, circles and settings, but not photos, video or other uploads. For recovering a lost server, you want **Back up everything**.
- **A note of which version of Kowloon you run** -- the `image:` lines in `docker-compose.yml` say, for example `ghcr.io/kowloon-network/kowloon:0.9.0`. Keeping a copy of the whole install folder's `docker-compose.yml` and `.env` does the job and does no harm; keep `.env` private, as it holds your server's secrets.

Pick whichever of these suits you. They can be combined.

### By hand, from the admin panel

In **Settings -> Maintenance**, every backup has a download button. Download your newest "everything" backup and keep it on your own computer, an external drive, or a cloud storage account. With automatic backups on, make a habit of it: weekly, say, or after anything you'd hate to lose.

This is simple, and it relies on you remembering.

### Automatically, from the server's command line

Your backup archives are kept in the server's file storage under `_backups/`. From the install folder, this lists them:

```bash
cd ~/kowloon
docker compose exec -T minio sh -c 'mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && mc ls local/kowloon/_backups/'
```

and this copies one out into the current folder (put the real file name in both places):

```bash
docker compose exec -T minio sh -c 'mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && mc cat local/kowloon/_backups/kowloon-full-backup-2026-11-16T03-00-00.tar.gz' > kowloon-full-backup-2026-11-16T03-00-00.tar.gz
```

A copy in another folder on the same machine still dies with the machine, so send it on: `scp` or `rsync` to another computer you control, or a tool like [rclone](https://rclone.org/) to cloud storage. Run it from a scheduled job (cron) a little after your automatic backups, which run at the hour you chose in **Settings -> Maintenance** (in UTC).

### Your host's own backups

Many hosting companies offer snapshots or backups of the whole machine, usually for a small extra charge. They're stored apart from your server, and restoring one brings back everything at once. They're an easy second line of defence, but check how often they run and how long they're kept. If someone hosts Kowloon for you, ask them what they do.

## Bringing your server back

You'll need your backup archive, your domain, and a new server that meets the [installation requirements](/docs/admin/install/#what-you-need).

:::caution[Same domain only]
A backup can only be restored onto a server with the **same domain** it came from. Every account and post is named after the domain, and other Kowloon servers know yours by it.
:::

### 1. Point your domain at the new server

Change your domain's A record to the new server's IP address. Do this first: the new server can't get its HTTPS certificate until the name points at it.

### 2. Install Kowloon

Follow the [installation guide](/docs/admin/install/), with three things to get right:

- **Install the version you were running, or a newer one.** Set `KOWLOON_VERSION` to it, for example `KOWLOON_VERSION=0.9.0`.
- **Use the same domain** as before.
- **Any admin username and password will do.** This account is only for getting in to run the restore. The restore replaces every account, this one included, with the old server's.

Leave the new server empty: don't sign anyone up or post anything. The restore replaces it all.

### 3. Restore the backup

There are two ways. Use the admin panel if your archive is smaller than 512 MB; use the command line for anything bigger.

**From the admin panel.** Sign in with the admin account you just created and go to **Settings -> Maintenance -> Restore from a backup**. Choose your archive, tick the box to confirm you understand it replaces what's there, and choose **Restore now**. The restore runs in the background; you can watch its progress in the backup list. When it's done, restart the server from the install folder so it picks up the restored settings:

```bash
cd ~/kowloon
docker compose restart
```

**From the command line.** Copy the archive onto the new server -- for example, from your own computer, `scp kowloon-full-backup-2026-11-16T03-00-00.tar.gz you@your-server:~` -- then, on the server, fetch Kowloon's restore script into your install folder and run it:

```bash
cd ~/kowloon
curl -fsSLO https://raw.githubusercontent.com/kowloon-network/kowloon/main/scripts/restore.sh
bash restore.sh ~/kowloon-full-backup-2026-11-16T03-00-00.tar.gz
```

It shows you what's in the backup and asks you to type `YES`. It then stops Kowloon, replaces the database, puts the files back, and starts everything again. It can take a while for a large archive.

### 4. Check and tidy up

1. Open `https://your-domain/health` and wait for `"status":"ok"`.
2. Sign in with your **old** username and password. Your members do the same.
3. Delete the `ADMIN_PASSWORD=` line from `.env` in the install folder and run `docker compose up -d`. It isn't needed any more, and it's a password in plain text.
4. In **Settings -> Maintenance**, the backup list still shows the backups from the old server -- their records came back with the database -- but the archives themselves were on the old machine and won't download. Delete them, then make a fresh **Back up everything** and copy it somewhere safe.

## What a restore brings back, and what it doesn't

Your server is returned to the moment the backup was made: accounts, posts, replies, circles, groups, pages, settings, and -- from an "everything" backup -- uploaded files. Because your server's identity keys are part of the database, other Kowloon servers recognise it as the same server, and it carries on talking to them.

Anything that happened after the backup is gone: new posts, new members, changed settings. That's why the age of your newest off-machine copy matters. A copy from last night costs you a day; a copy from last spring costs you everything since.

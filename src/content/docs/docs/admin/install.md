---
title: Installing Kowloon
description: Put a Kowloon server on the internet -- what you need, the one-line installer, the setup wizard, and checking it worked.
sidebar:
  order: 1
---

This guide takes you from an empty server to a running Kowloon community with you as its first admin. You'll type a handful of commands and fill in one web form. Expect it to take about half an hour, most of it waiting for a domain name to start working.

You don't need to know Docker, Node or MongoDB. The installer sets all of that up for you. You do need to be comfortable logging in to a server over SSH and pasting commands.

## What you need

**A server.** A rented virtual server (a "VPS") from any hosting company is fine. It needs:

- **Linux.** Ubuntu or Debian is easiest: on those, the installer installs Docker for you if it isn't there already. On any other Linux, [install Docker](https://docs.docker.com/get-docker/) yourself first, including the Compose plugin (`docker compose`, not the older `docker-compose`).
- **A 64-bit processor and operating system.** Intel/AMD (x86-64) or ARM (arm64) both work, including the cheaper ARM plans many hosts sell. A 32-bit system won't run Kowloon, even on 64-bit hardware.
- **Enough room.** Kowloon runs a database, file storage, the app and four small background workers side by side. **1 GB of memory** is enough for a small community; choose **2 GB** if your members will post a lot of video, because processing it takes extra memory for a moment. Start with **20 GB of disk**: photos, video and backups (see [Recovering from a lost server](/docs/admin/restore/)) are what fill it, so allow for growth.
- **Open ports.** Ports **80** and **443** must be reachable from the internet; that's how people reach your site and how it gets its HTTPS certificate. During setup only, the wizard also uses port **2999** (or you can reach it through an SSH tunnel instead -- see below). Some hosts have a firewall in their control panel as well as on the machine; check both.

:::note[Running it on a Raspberry Pi]
A **Raspberry Pi 5** can run Kowloon: install the 64-bit Raspberry Pi OS, then follow this guide as normal. Older Pis, including the Pi 4, can't, because the database Kowloon uses needs a newer processor. Two tips: run from an SSD rather than a memory card, which wears out under a database; and if the Pi is at home, your router has to forward ports 80 and 443 to it, and your domain has to follow your home IP address if it changes. Pi support is new, so tell us how you get on.
:::

**A domain name.** People will reach your community at an address like `social.example.com`. It can be a whole domain or a subdomain of one you already own. Choose carefully: **the domain is your server's identity and can't be changed later.** Every account and post is named after it, and other Kowloon servers know you by it.

**Optionally, an email service.** Kowloon sends invitations, password resets and backup notices by email. You'll want an SMTP account from a mail provider (the host name, port, username and password they give you). You can add it during setup or later in the admin panel, but individual invites won't arrive until it's set up.

## 1. Point your domain at the server

Find your server's public IP address in your host's control panel. Then, wherever you manage your domain's DNS, add an **A record** for your chosen name pointing to that address.

DNS changes can take anywhere from a minute to a few hours to spread. You can carry on while you wait; the installer will tell you whether the name points at the right place yet. But your server can't get its HTTPS certificate until it does.

## 2. Run the installer

Log in to your server over SSH and run:

```bash
curl -fsSL https://raw.githubusercontent.com/kowloon-network/kowloon/main/install.sh | bash
```

The installer:

1. checks for Docker, and on Ubuntu or Debian installs it if it's missing;
2. creates the folder your server's settings will live in -- `~/kowloon` unless you choose another;
3. shows your server's public IP address, so you can check it against your DNS record;
4. starts the setup wizard and waits for you to fill it in.

:::note[If Docker needs sudo]
If Docker is installed but your user isn't allowed to use it, the installer stops and says so. Either run it again as root, or add yourself to the `docker` group (`sudo usermod -aG docker $USER`), log out and back in, and run it again.
:::

### Choosing a version

By default you get the newest **stable** release. (Until the first release is published, the installer says so and installs the latest development build instead.) You can ask for a particular one by setting `KOWLOON_VERSION`:

```bash
# A specific release
curl -fsSL https://raw.githubusercontent.com/kowloon-network/kowloon/main/install.sh | KOWLOON_VERSION=0.9.0 bash

# The development version -- untested, not for a community people rely on
curl -fsSL https://raw.githubusercontent.com/kowloon-network/kowloon/main/install.sh | KOWLOON_VERSION=latest bash
```

Whichever you choose, your server stays on that exact version until you decide to upgrade. Nothing updates itself behind your back. See [Upgrading Kowloon](/docs/admin/upgrading/).

### Choosing where it lives

To put the settings folder somewhere other than `~/kowloon`, add the path at the end:

```bash
curl -fsSL https://raw.githubusercontent.com/kowloon-network/kowloon/main/install.sh | bash -s -- /opt/kowloon
```

Remember where it is. Every command in these guides is run from that folder.

## 3. Fill in the setup wizard

When the installer is ready it prints an address like `http://203.0.113.10:2999`. Open it in your browser.

:::tip[A safer way to open the wizard]
The wizard is plain HTTP, so the password you type into it crosses the internet unencrypted, and port 2999 has to be open. You can avoid both with an SSH tunnel. On your own computer, run `ssh -L 2999:localhost:2999 you@your-server`, then open `http://localhost:2999` instead.
:::

The form has three parts.

**Your Server**

- **Domain** -- the name you pointed at the server, such as `social.example.com`. As you type, the wizard checks it: a green note means it already points here; a warning means it doesn't yet. You can carry on either way, but HTTPS won't work until the DNS is right.
- **Site name** -- your community's name. You can change it later in the admin panel.

**Your Admin Account** -- the first account on the server, which becomes its administrator.

- **Username** -- 2 to 32 lowercase letters, numbers or underscores.
- **Display name** -- optional; the username is used if you leave it blank.
- **Email** -- for admin notices, such as a failed backup. It isn't shown publicly.
- **Password** and **Confirm password** -- at least 10 characters.

**Advanced settings** -- folded away, and you can usually leave them alone.

- **Email (SMTP)** -- your mail provider's **SMTP host**, **Port** (587 unless they say otherwise), **SMTP username** and **SMTP password**. **Send test email** sends a message to the admin email above, so you know it works before you finish. You can skip this and fill it in later under **Settings -> Email**.
- **Reverse Proxy & SSL** -- by default Kowloon gets and renews its own HTTPS certificate, and that's what you want. Tick **I'll manage my own SSL and reverse proxy** only if you already run something like Nginx or a tunnel service in front of your sites; Kowloon then listens on the **Application port** you choose (3000 by default), and forwarding HTTPS traffic to it is up to you.
- **This box already runs another Kowloon server** -- for putting a second community on the same machine. See [Running a second server on the same machine](#running-a-second-server-on-the-same-machine).

Click **Install Kowloon**.

## 4. Wait for it to start

The wizard switches to a progress list, and the terminal picks up where it left off: it downloads Kowloon, starts it, and waits for your site to answer over HTTPS. This usually takes a minute or two. When it's done, the terminal says **Kowloon is installed!** and shows your address.

The first time your site starts, Kowloon:

- obtains an HTTPS certificate for your domain from Let's Encrypt, and renews it automatically from then on;
- creates your admin account;
- creates three pages -- **Terms of Service**, **Privacy Policy** and **Community Rules** -- filled in with your site name and admin email. They're plain-language starting points, not legal advice: read them and edit them to fit your community.

If the terminal says Kowloon isn't responding after two minutes, it's usually still waiting for DNS or the certificate. Give it a few minutes and try your address again, or watch what it's doing with `docker compose logs -f` (Ctrl-C to stop watching).

## 5. Sign in

Open `https://your-domain` and sign in with the username and password you chose. Then go straight on to the [Quick Start for Server Admins](/docs/admin/quick-start/): it walks you through the first things to set up, starting with backups and a second administrator.

Your settings live in the install folder:

- `.env` -- your domain, database and storage settings, generated secrets, and email settings.
- `docker-compose.yml` -- which parts of Kowloon run, and which version.
- `Caddyfile` -- the web server that handles HTTPS. (Not created if you manage your own SSL.)

Keep a copy of `.env` somewhere safe and private: it holds your server's secrets, and you'll want it if you ever have to [rebuild the server](/docs/admin/restore/).

:::caution[Tidy up the admin password]
`.env` also holds the admin password you typed into the wizard, in plain text. It's only used to create your account the very first time Kowloon starts, on an empty server. Once you've signed in, change your password in **Profile & Settings**, then delete the `ADMIN_PASSWORD=` line from `.env` and run `docker compose up -d`.
:::

## Checking that it's healthy

Your server has a health page at `https://your-domain/health`. Open it in a browser, or from the server run:

```bash
curl https://your-domain/health
```

It reports on the database, file storage, and the four background workers: **outbox** (sends your members' posts to other Kowloon servers), **pull** (fetches posts from them), **media** (processes uploads) and **backup**. The overall `status` is one of:

- **`ok`** -- everything is working.
- **`degraded`** -- the site works, but a background worker has stopped, so posts may not reach other servers, uploads may not finish processing, or backups may not run. The `message` says which.
- **`error`** -- the database or file storage can't be reached, and the page answers with HTTP 503. The site won't work properly until that's fixed.

A worker shows as stopped if it hasn't checked in for five minutes. To see what's wrong, look at the logs from your install folder: `docker compose ps` lists everything that's running, and `docker compose logs worker-media` (or `worker-outbox`, `worker-pull`, `worker-backup`, `app`) shows what one part has been saying. `docker compose up -d` starts anything that has stopped.

The health page is cheap and public, so it's a good thing to point an uptime monitor at.

## Everyday commands

Run these from your install folder:

```bash
docker compose ps            # what's running
docker compose logs -f       # follow the logs (Ctrl-C to stop)
docker compose up -d         # start everything, or apply changes to .env
docker compose restart       # restart everything
docker compose down          # stop the server (your data is kept)
```

If you change `.env`, use `docker compose up -d` rather than `restart`: only `up` picks up the new settings.

## Running a second server on the same machine

One machine can host more than one Kowloon community, each with its own domain, members, database and files. Only one of them can answer on ports 80 and 443, so the second one shares the first one's web server.

1. Point the second domain at the same IP address.
2. Run the installer again, into a **new** folder. It refuses to install over an existing server, so you can't overwrite the first one by accident:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/kowloon-network/kowloon/main/install.sh | bash -s -- ~/kowloon-second
   ```

3. In the wizard, open **Advanced settings** and tick **This box already runs another Kowloon server**. Leave **Shared network name** as `kowloon-edge` unless you've used a different name before.
4. When it finishes, the second server is running but nothing points web traffic at it yet. The installer says so, and writes a step-by-step guide, `COHOST-SETUP.md`, into the new folder. In short, you edit the **first** server's `docker-compose.yml` so its `caddy` service joins the shared network, paste the block from the new folder's `caddy-vhost.caddy` into the first server's `Caddyfile`, and run `docker compose up -d` in the first server's folder.

The second domain then gets its own HTTPS certificate automatically. The two servers share nothing but the front door: each has its own database, files, workers and backups, and you upgrade each one separately, from its own folder.

## Next

- [Quick Start for Server Admins](/docs/admin/quick-start/) -- everything you do in the admin panel.
- [Upgrading Kowloon](/docs/admin/upgrading/) -- moving to a new release.
- [Recovering from a lost server](/docs/admin/restore/) -- read this before you need it.

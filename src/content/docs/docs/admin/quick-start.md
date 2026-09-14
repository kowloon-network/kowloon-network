---
title: Quick Start for Server Admins
description: You've been handed a Kowloon server. Here's what you can do with it, in the order you'll probably want to do it.
sidebar:
  order: 1
---

Someone has set up a Kowloon server and made you its admin. You don't need to touch a terminal, edit a config file, or know what federation means to run it well. Everything in this guide happens in your browser.

Sign in at your server's address the way anyone else would, and you'll find an **Admin** link in your account menu. That's the whole control panel.

## First: change your password

Whoever set the server up gave you a password. Change it.

Go to **Profile & Settings** (your own profile, not the admin panel) and find the **Password** section. Enter the password you were given, choose a new one, save.

You'll stay signed in on this device. If you're signed in on a phone as well, that session keeps working until it expires on its own -- changing your password doesn't kick you out everywhere.

While you're there, fill in your own profile. You're the most visible person on this server, and a blank admin account is an odd first impression.

## Make the server look like yours

Two places control this, and they do different jobs.

**Settings → Appearance** holds the **Server Profile**: the name people see, the description that appears on your landing page, the icon (your small square logo) and the hero image (the wide banner across the top). This is your server's identity -- what it's called and what it looks like at a glance.

**Themes** controls colour. Build a theme and every part of the site follows it: page background, body text, buttons and links, the sidebar, borders. The editor labels things in plain language rather than developer jargon, so "Primary Color -- buttons, links, and highlights" is exactly what it says.

Once you set a theme as the site default, that's what visitors who aren't logged in will see. Members can override it with Light, Dark or Auto if they'd rather, but your theme is the face of the place.

There's no wrong answer here, and nothing you change is permanent. Try things.

## Decide who can join

**Settings → Registration** has a single switch: **Open Registration**.

Leave it **off** and your server is invite-only. Nobody can create an account without a code from you. This is the right default for a community with a defined membership -- a group, a campaign, a set of people who know each other.

Turn it **on** and anyone who finds your server can sign up. Easier to grow, but you'll get drive-by signups and you're accepting that you'll moderate strangers.

### Inviting people

With registration closed, **Invites** is how people get in. Create an invite and you can set:

- **Max Redemptions** -- leave it blank for an unlimited link, or set it to 1 for a single person.
- **Expires** -- an optional cut-off date.
- **Note** -- for your own records, so you remember who a link was for.

Each invite gives you a link and a **QR code**, which is genuinely useful at an in-person meeting: put it on a slide or a printed card and people join by pointing a phone at it.

:::caution[Invites need email configured]
Some invite flows send mail. If your server has no email set up (**Settings → Email**), those messages silently never arrive.

If email isn't configured yet, you can still onboard people: create their account yourself under **Users → New user**, leave the password field blank, and the server generates one and shows it to you **once**. Copy it, hand it over however you like, and tell them to change it in Profile & Settings.
:::

## Write your rules

**Settings → Moderation** has **Community Rules**. Add one rule per entry, in plain language.

This isn't decoration. New members must tick every rule to finish signing up, and the server records which version of the rules they agreed to -- so editing them later doesn't rewrite anyone's history. It also gives you something concrete to point at when you act on a report, which makes moderation feel less personal and more like a process.

Write them before you invite people, not after your first argument.

## Fill the place with something

A server where the only content is other people's posts feels like a waiting room. Three tools make it yours.

**Pages** are documents that live on the server: an about page, a code of conduct, a schedule, a history of the group. Each has a title, a summary, the content itself, an optional **Featured Image**, and an **Order** that controls where it sits in the list. You can nest one page under another with **Parent Page** if you're building something with sections.

**Bookmarks** are links the whole server can see -- a shared reading list. Each has a URL, a summary, and a **Visibility** setting so you can keep some internal. You can sort them into **Folders**.

**Discover** is the curated shelf new arrivals see. You can feature posts, circles, groups and other servers, each with a short blurb explaining *why* it's worth their time. That blurb does a lot of work: "Weekly planning thread, start here" tells a new member more than a bare link ever will.

## Moderation

**Moderation** has two tabs.

### Reports

When a member reports something, it lands here. Each report shows what was flagged, who posted it, who reported it, and why. You can:

- **Ignore** it, if there's nothing to answer.
- **Remove** the content, which takes it down but keeps a record.
- **Hard-delete** it, which is permanent.
- **Block the creator**, which stops them and notifies them.

Reasons members can choose from are set in **Settings → Moderation** and cover the usual ground: spam, harassment, hate speech, threats, sexually explicit content, child sexual exploitation, self-harm, and a free-text "other".

### Servers

This is the one that matters when trouble comes from outside your server rather than inside it. Enter another server's address -- `example.org`, `@example.org` or `https://example.org` all work -- optionally note why, and choose:

- **Block** stops replies and reactions from that server, but its posts still appear. Use this when a server's *behaviour* is the problem but your members legitimately follow people there. Nobody silently loses someone they were reading.
- **Defederate** cuts the server off completely. Nothing comes in, nothing goes out, and it disappears from search and discovery. Use this for a server that is hostile, malicious, or dedicated to harassment.

Blocked servers are listed with an **Undo** next to each. Both actions are reversible, so if you're unsure, block first -- you can always escalate.

:::tip[You can block a server you've never heard from]
You don't have to wait to be attacked. If you know of a server that targets communities like yours, block it now. You don't need to have received anything from it first.
:::

## Users

**Users** lists everyone on the server. You can search, create accounts, deactivate people (which is the ban mechanism), and restore accounts you deactivated by mistake.

Remote accounts from other servers are hidden by default, so this list shows your actual members rather than everyone your server has ever encountered.

## What you can safely ignore

The admin panel has more in it than you need on day one. **Posts**, **Circles** and **Groups** are administrative views of things members create -- useful when you're hunting for something specific, not places you need to tend. **Logs** and the diagnostics on the **Dashboard** are there for whoever looks after the server technically.

## A short first-day checklist

1. Change your password, fill in your profile.
2. Set the server name, description, icon and hero image.
3. Pick your colours in Themes.
4. Decide open or invite-only.
5. Write your community rules.
6. Write an about page.
7. Invite a handful of people you trust before opening the doors wider.

## If something needs a person

Some things aren't in the admin panel: email configuration, backups, upgrades, and anything involving the machine the server runs on. Those belong to whoever set the server up for you. If email isn't working, invites aren't arriving, or the site is down, that's the person to ask -- it isn't something you've done wrong.

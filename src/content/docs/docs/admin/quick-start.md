---
title: Quick Start for Server Admins
description: You've been handed a Kowloon server. Here's what you can do with it, in the order you'll probably want to do it.
sidebar:
  order: 1
---

Someone has set up a Kowloon server and made you its admin. You don't need to touch a terminal, edit a config file, or know what federation means to run it well. Everything in this guide happens in your browser.

Sign in at your server's address the way anyone else would, and you'll find an **Admin** link in your account menu. That's the whole control panel. Its menu is grouped into **Manage** (moderation and the things members create), **Community** (Discover, Pages, Bookmarks) and **System** (Invites, Themes, Settings, Logs).

## First: change your password

Whoever set the server up gave you a password. Change it.

Go to **Profile & Settings** (your own profile, not the admin panel) and find the **Password** section. Enter the password you were given, choose a new one, save.

You'll stay signed in on the device you're using. Every other session -- a phone, another browser, anywhere the old password was used -- is signed out. That's the point: whoever had the old password no longer has a way in.

While you're there, fill in your own profile. You're the most visible person on this server, and a blank admin account is an odd first impression.

## Make the server look like yours

Two places control this, and they do different jobs.

**Settings -> Appearance** holds the server's identity: its **Server name**, a **Subtitle**, the **Description** that appears on your landing page, the **Server icon** (your small square logo), the **Hero image** (the wide banner across the top) and an optional **Location**. You can also choose which **Reaction emojis** members get to react with.

**Themes** controls colour. Build a theme and every part of the site follows it: page background, body text, buttons and links, the sidebar, borders. The editor labels things in plain language rather than developer jargon, so "Primary Color -- buttons, links, and highlights" is exactly what it says.

Once you set a theme as the site default, that's what visitors who aren't logged in will see. Members can override it with Light, Dark or Auto if they'd rather, but your theme is the face of the place.

There's no wrong answer here, and nothing you change is permanent. Try things.

## Don't run it alone

**Settings -> General** has an **Administrators** picker. Add at least one person you trust. If you're the only admin and you lose access, nobody can let you back in from the inside.

The changes take effect immediately. Leave the **Domain** field alone -- changing it breaks your server's connections to every other server.

## Bring people in

Every Kowloon server is invite-only -- there's no "let anyone sign up" switch to flip. That's deliberate: Kowloon works best as a lot of small, well-moderated communities rather than one undifferentiated open one, and an invite you control is easier to walk back than an open door.

That doesn't mean joining has to be slow. **Invites** is where you create the way in, and there are two kinds:

- **Individual** -- for one specific person. You enter their email address and the server emails them the invitation.
- **Open** -- a link anyone can use. Set **Max Redemptions** to cap how many people can join with it, or leave it blank for no limit.

Both kinds take an optional **Expires** date and a **Note**, for your own records, so you remember who a link was for. Every invite also gives you a **QR code**, which is genuinely useful at an in-person meeting: put it on a slide or a printed card and people join by pointing a phone at it.

If an invite has done its job or ended up somewhere it shouldn't be, **Deactivate** it. Nobody new can join with it, and anyone who already joined keeps their account.

:::caution[Individual invites need email]
Individual invites arrive by email. If your server's email isn't set up (**Settings -> Email**), they silently never arrive.

You can still onboard people without email. Use an open invite with **Max Redemptions** set to 1 and send them the link yourself. Or create their account under **Users -> New user**, leave the password field blank, and the server generates one and shows it to you **once**. Copy it, hand it over however you like, and tell them to change it in Profile & Settings.
:::

## Write your rules

**Settings -> Moderation** has **Community rules**. Click **Add rule** for each one and write it in plain language.

This isn't decoration. New members must tick every rule to finish signing up, and the server keeps a copy of the exact wording each person agreed to -- so editing the rules later doesn't rewrite anyone's history. It also gives you something concrete to point at when you act on a report, which makes moderation feel less personal and more like a process.

Write them before you invite people, not after your first argument.

## Fill the place with something

A server where the only content is other people's posts feels like a waiting room. Three tools make it yours.

**Pages** are documents that live on the server: an about page, a code of conduct, a schedule, a history of the group. Each has a title, a summary, the content itself, an optional **Featured Image**, a **Visibility** setting (anyone, or members only) and an **Order** that controls where it sits in the list. You can nest one page under another with **Parent Page** if you're building something with sections.

**Bookmarks** are links the whole server can see -- a shared reading list. Each has a URL, a summary, and a **Visibility** setting so you can keep some internal. You can sort them into **Folders**.

**Discover** is the curated shelf new arrivals see, split into Media, Posts, Circles, Groups and Servers. To feature a post, circle or group, find it and choose **Add to Discovery**; other servers are added on the Discover page itself with **Add Server**. Each entry takes a short **Commentary** explaining *why* it's worth a newcomer's time, and that does a lot of work: "Weekly planning thread, start here" tells a new member more than a bare link ever will. You can rename, reorder or hide each shelf, and make it visible to everyone or to members only.

## Moderation

**Moderation** has two tabs.

### Reports

When a member reports something, it lands here. Each report shows what was flagged, who posted it, who reported it, and why. You can:

- **Ignore** it, if there's nothing to answer.
- **Remove** the content. It disappears from the server, and both the person who reported it and the person who posted it are told.
- **Hard Delete** it (under **More**), which removes it permanently, straight away.
- **Block Creator** (also under **More**), which closes the poster's account and signs them out. The person who reported it is told; the blocked person isn't.

Members choose a reason when they report something. The defaults cover the usual ground -- spam, harassment, hate speech, threats, sexual content, child sexual exploitation, self-harm, misinformation, impersonation, extremism, graphic violence, illegal goods, and a free-text "other" -- and you can edit the list under **Settings -> Moderation -> Report categories**.

:::caution[Removed things don't wait forever]
Removed content and closed accounts are kept for a while so you can change your mind, then deleted for good. How long is set under **Settings -> Maintenance -> Deleted content retention** -- 30 days unless you change it.
:::

### Servers

This is the one that matters when trouble comes from outside your server rather than inside it. Enter another server's address -- `example.org`, `@example.org` or `https://example.org` all work -- optionally note why, and choose:

- **Block** stops replies and reactions from that server, but its posts still appear. Use this when a server's *behaviour* is the problem but your members legitimately follow people there. Nobody silently loses someone they were reading.
- **Defederate** cuts the server off completely. Nothing comes in and nothing goes out. Use this for a server that is hostile, malicious, or dedicated to harassment.

Blocked servers are listed with an **Undo** next to each. Both actions are reversible, so if you're unsure, block first -- you can always escalate.

:::tip[You can block a server you've never heard from]
You don't have to wait to be attacked. If you know of a server that targets communities like yours, block it now. You don't need to have received anything from it first.
:::

## Users

**Users** lists everyone with an account on your server; people visiting from other servers aren't shown. You can search, create accounts with **New user**, and **Delete** an account, which closes it and signs the person out.

A deleted account can be brought back from the **Deleted** filter until the retention period runs out. If you select several accounts at once you'll also be offered a permanent delete, which can't be undone.

## Email and backups

Two things in **Settings** are worth a look early, even if someone else set them up.

**Settings -> Email** is how your server sends mail: invitations, password resets, and backup links. If invites aren't arriving, check here first. The **From address** needs to be on the same domain as your mail service, or messages quietly end up in spam.

**Settings -> Maintenance** has **Create backup**, which emails you a download link valid for 48 hours. Take one before you make big changes. **Restore from backup** is there too, but it replaces *everything* on the server with the backup's contents, so treat it as a last resort.

## What you can safely ignore

The admin panel has more in it than you need on day one. **Posts**, **Circles** and **Groups** are administrative views of things members create -- useful when you're hunting for something specific, not places you need to tend. **Logs**, the server figures on the **Dashboard**, and the **Media** and **Integrations** settings tabs are there for whoever looks after the server technically.

The Dashboard's activity figures -- posts today, new members this week, invites used, open reports -- are worth a glance, though. Open reports especially.

## A short first-day checklist

1. Change your password, fill in your profile.
2. Add a second administrator.
3. Set the server name, description, icon and hero image.
4. Pick your colours in Themes.
5. Write your community rules.
6. Write an about page.
7. Create your first invite -- an individual one for someone specific, or an open link if you're opening the doors wide.
8. Invite a handful of people you trust before opening the doors wider.

## If something needs a person

Some things aren't in the admin panel: upgrading the server, the machine it runs on, and anything that needs a terminal. Those belong to whoever set the server up for you. If the site is down or email stops working even though the settings look right, that's the person to ask -- it isn't something you've done wrong.

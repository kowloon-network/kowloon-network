---
title: Quick Start for Server Admins
description: You've been handed a Kowloon server. Here's what you can do with it, in the order you'll probably want to do it.
sidebar:
  order: 1
---

Someone has set up a Kowloon server and made you its admin. You don't need to touch a terminal, edit a config file, or know what federation means to run it well. Everything in this guide happens in your browser or the Kowloon app.

Sign in the way anyone else would. On the web, you'll find **Admin** in your account menu; in the app, it's **Server Admin**, at the bottom of the side menu. That's the whole control panel, and it's built to work on a phone -- most of what follows you can do standing in a queue.

The panel opens on the **Dashboard**. Its menu is grouped into **Manage** (Moderation, and the things members create), **Community** (Discover, Pages, Bookmarks) and **System** (Invites, Themes, Settings, Logs).

## The Dashboard

The Dashboard puts what needs you first:

- **Your community** -- members, posts today, new members this month and this year, and the rest of the server's vital signs at a glance.
- **Moderation** -- the open reports, newest first. Tap one to deal with it, or follow the link to the full list.
- **Create new** -- one tap to a new **Invite**, **Page**, **Bookmark** or **Circle**, the things you'll make most often.
- **Server health** -- disk, memory, database and uptime, folded away because you'll rarely need it. If something looks wrong there, tell whoever set the server up.

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

Changes take effect immediately. Leave the **Domain** field alone -- changing it breaks your server's connections to every other server.

### Moderators

Just below Administrators is a **Moderators** picker. Moderators share the day-to-day work without holding the keys to the whole server. They see a smaller admin panel, and they can:

- handle **reports** -- ignore, remove, or delete permanently;
- **block** people and servers elsewhere, and **defederate** a server -- every admin is notified when a moderator defederates a server or lifts it, with who did it and why;
- **close** a member's account, or restore one;
- add and edit **Pages**, **Bookmarks**, **Discover** and server **Circles**.

They can't ban a member, delete content, see the banned-email lists, create accounts, or touch invites, themes or settings. They also can't act against an admin or another moderator -- that comes to you. Every new report notifies every admin and moderator, and everything a moderator does records who did it.

## Bring people in

Every Kowloon server is invite-only -- there's no "let anyone sign up" switch to flip. That's deliberate: Kowloon works best as a lot of small, well-moderated communities rather than one undifferentiated open one, and an invite you control is easier to walk back than an open door.

That doesn't mean joining has to be slow. **Invites -> New Invite** (or **Create new -> Invite** on the Dashboard) makes a way in, and there are two kinds:

- **Individual** -- for one specific person. You enter their email address and the server emails them the invitation.
- **Open** -- a link anyone can use. Set **Max Redemptions** to cap how many people can join with it, or leave it blank for no limit.

Both kinds take an optional **Expires** date and a **Note**, for your own records, so you remember who a link was for.

When you create an invite you're shown its link, ready to copy, and a **QR code**. The QR code is genuinely useful at an in-person meeting: put it on a slide or a printed card and people join by pointing a phone at it. You can get both back later from the **Invites** list.

If an invite has done its job or ended up somewhere it shouldn't be, **Deactivate** it. Nobody new can join with it, and anyone who already joined keeps their account.

:::caution[Individual invites need email]
Individual invites arrive by email. If your server's email isn't set up (**Settings -> Email**), they silently never arrive.

You can still onboard people without email. Use an open invite with **Max Redemptions** set to 1 and send them the link yourself. Or go to **Users -> New User**, leave the password blank, and the server generates one and shows it to you **once**. Copy it, hand it over however you like, and tell them to change it in Profile & Settings.
:::

## Write your rules

**Settings -> Moderation** has **Community rules**. Click **Add rule** for each one and write it in plain language.

This isn't decoration. New members must tick every rule to finish signing up, and the server keeps a copy of the exact wording each person agreed to -- so editing the rules later doesn't rewrite anyone's history. It also gives you something concrete to point at when you act on a report, which makes moderation feel less personal and more like a process.

Write them before you invite people, not after your first argument.

## Fill the place with something

A server where the only content is other people's posts feels like a waiting room. Three tools make it yours.

**Pages** are documents that live on the server: an about page, a code of conduct, a schedule, a history of the group. **New Page** gives you a title, a summary, the content itself, an optional **Featured Image** and a **Visibility** setting (**Public**, or **Server only** for members). You can nest one page under another with **Parent Page** if you're building something with sections. To change the order pages are listed in, drag them by the handle on the **Pages** list.

**Bookmarks** are links the whole server can see -- a shared reading list. **New Bookmark** makes either a link or a **Folder** to sort links into; each takes a summary and a **Visibility** setting, so you can keep some internal. As with Pages, drag them on the list to set their order.

**Circles** aren't only for members. **Circles -> New Circle** makes one that belongs to the server rather than to you -- a "Local writers" or "Our sister servers" list that outlives any one person's account. Once you've named it, you're taken to its page, where you add and remove members the same way you would with your own circles. Any admin can manage it, and its **Visibility** is **Public** or **Server only**. Put it on Discover and newcomers get a ready-made list of people worth reading.

**Discover** is the curated shelf new arrivals see, split into Media, Posts, Circles, Groups and Servers. To feature a post, circle or group, find it and choose **Add to Discovery**; other servers are added on the Discover page itself with **Add Server**. Each entry takes a short **Commentary** explaining *why* it's worth a newcomer's time, and that does a lot of work: "Weekly planning thread, start here" tells a new member more than a bare link ever will. You can rename, reorder or hide each shelf, and make it visible to everyone or to members only.

## Moderation

**Moderation** has four tabs: **Reports**, **Blocked**, **Defederated** and **Emails**.

### Reports

When a member reports something, it lands here, and the newest open reports are also on your Dashboard. The list shows **Open**, **Resolved** or **Dismissed** reports. Each one shows what was reported, who posted it and who reported it; tap it to open the report.

The report page shows the reported item, the reason the member chose and any note they added, and under **What to do**:

- **Ignore** -- nothing needs doing. The reporter is told no action was taken.
- **Remove** -- take it down. The reporter and the author are both told.
- **Block creator**, if the author is on another server -- everything they send your server is refused from now on, and they're added to the **Blocked** list. The reporter is told; the blocked person isn't.
- **Ban author**, if the author is a member of *your* server -- see [Banning a member](#banning-a-member) below before you use it.
- **Delete permanently** -- the item is gone for good, straight away.

Members choose a reason when they report something. The defaults cover the usual ground -- spam, harassment, hate speech, threats, sexual content, child sexual exploitation, self-harm, misinformation, impersonation, extremism, graphic violence, illegal goods, and a free-text "other" -- and you can edit the list under **Settings -> Moderation -> Report categories**.

:::caution[Removed things don't wait forever]
Removed content and deleted accounts are kept for a while so you can change your mind, then deleted for good. How long is set under **Settings -> Maintenance -> Deleted content retention** -- 30 days unless you change it. Bans and **Delete permanently** don't wait: they're immediate.
:::

### Blocked

The **Blocked** list is the people and servers your server won't interact with. Type a person (`@name@example.org`) or a server (`example.org`), give a reason, and choose **Add to Blocked**. What happens depends on who you added:

- **A person on another server** can't reply to or react to anything here, stops receiving your members' posts, and can't sign in here as a visitor.
- **A whole server** keeps its posts flowing to members who follow people there, but its replies and reactions are refused. Use this when a server's *behaviour* is the problem but your members legitimately read people on it -- nobody silently loses someone they were reading.
- **A member of your own server** is banned. That's a much bigger step; see below.

Blocking decides who can interact with your server, not who your members can read. A member who wants to keep reading someone you've blocked still can, but that person can't reply to them or react to their posts.

Each entry keeps its reason, which you can edit, and the date it was added. Remove an entry to undo the block.

The list is **Private** (admins only) by default. You can make it **Public**, so your members -- or anyone -- can see who's blocked and why. If you do, the reasons become public too, so read them over first.

:::tip[You can block a server you've never heard from]
You don't have to wait to be attacked. If you know of a server that targets communities like yours, block or defederate it now. You don't need to have received anything from it first.
:::

### Defederated

**Defederated** is for servers only, and it's the stronger measure: a complete cut-off. Nothing comes in and nothing goes out. Your members can't follow anyone there, your server stops sending it anything and refuses everything it asks for, its people can't sign in here as visitors, and it disappears from search and Discover.

Public posts are still public, though. Anyone can open a public page in a browser, and that includes people on a server you've defederated. Defederating stops the two servers talking to each other; it doesn't make your public posts private. Use it for spam, malware, and servers that exist to harass.

Anything already stored from a defederated server is hidden rather than deleted, so if you change your mind and remove it from the list, it all comes back.

A server is only ever on one of the two lists. Adding a blocked server to Defederated moves it there, and the other way round. If you're unsure which to use, block first; you can always escalate.

### Emails

The **Emails** tab holds banned **Addresses** and banned **Domains**. Neither can be used to sign up, to change an account's email, or to get an individual invite. Ban a domain for disposable-mail services and the like.

When you ban a member, their address is added here automatically. Only admins can see these lists.

## Users

**Users** lists everyone with an account on your server; people visiting from other servers aren't shown. You can search, switch between **Active**, **Deleted** and **All**, and create accounts with **New User**.

Each account has two very different ways out:

- **Delete** closes the account and signs the person out. It can be restored from the **Deleted** filter until the retention period runs out.
- **Ban** is permanent. It asks for a reason, which is shown on the Blocked list.

Select several accounts at once and you can delete them together, or delete them permanently. A permanent delete removes the accounts and everything those people posted, straight away; unlike a ban, their usernames and email addresses are free to use again. Admin accounts can't be deleted this way -- take away their admin rights first.

### Banning a member

A ban -- from **Users**, from **Ban author** on a report, or by adding a member to **Blocked** -- deletes the person's account and everything they posted, immediately and for good. It can't be undone, so Kowloon asks you to confirm it every time.

Their username stays reserved, so nobody can register it and pass as them, and their email address goes on the banned list so they can't sign up again with it.

Banning deletes rather than suspends on purpose: a suspended account can't delete its own data, and people have a right to have theirs removed. Keep bans for known bad actors. For anyone else, **Delete** does the job and can be taken back.

## Email and backups

Two things in **Settings** are worth a look early, even if someone else set them up.

**Settings -> Email** is how your server sends mail: invitations, password resets, and backup links. If invites aren't arriving, check here first. The **From address** needs to be on the same domain as your mail service, or messages quietly end up in spam.

**Settings -> Maintenance** is where backups live. A backup can be of **the database** -- posts, accounts, settings, everything except uploaded photos and video -- or of **everything**, which adds every uploaded file. The database is small. Everything is what fills a disk.

You can make one by hand at any time with **Back up the database** or **Back up everything**. Take one before you make big changes. You can also switch on **Automatic backups**: choose how often to back up the database and how often to back up everything (off, daily or weekly), how many of each to keep, and the hour they run. A sensible start is the database daily and everything weekly. The page shows how much space that will take before you save it. Older automatic backups are deleted as new ones succeed; ones you make by hand stay until you delete them. If an automatic backup fails, every admin gets an email.

Every backup is listed with its size, a download button and a delete button. Backups are kept on the server itself, so they protect you from mistakes and crashes but not from losing the machine -- download the important ones and keep a copy somewhere else. If someone hosts your server for you, ask whether they back it up too.

**Restore from a backup** is at the bottom. A full backup replaces the database and the uploaded files; a database backup replaces only the database. Treat it as a last resort.

## What you can safely ignore

The admin panel has more in it than you need on day one. **Posts** and **Groups**, and the members' circles listed under **Circles**, are administrative views of things members create -- useful when you're hunting for something specific, not places you need to tend. **Logs**, **Server health** on the Dashboard, and the **Media** and **Integrations** settings tabs are there for whoever looks after the server technically.

## A short first-day checklist

1. Change your password, fill in your profile.
2. Add a second administrator.
3. Decide on backups in **Settings -> Maintenance** -- at least the database daily.
4. Set the server name, description, icon and hero image.
5. Pick your colours in Themes.
6. Write your community rules.
7. Write an about page.
8. Create your first invite -- an individual one for someone specific, or an open link if you're opening the doors wide.
9. Invite a handful of people you trust before opening the doors wider.

## If something needs a person

Some things aren't in the admin panel: upgrading the server, the machine it runs on, and anything that needs a terminal. Those belong to whoever set the server up for you. If the site is down or email stops working even though the settings look right, that's the person to ask -- it isn't something you've done wrong.

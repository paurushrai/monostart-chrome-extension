# MonoStart — User Guide

**Your browser's new tab, reimagined as a dashboard.**

MonoStart replaces Chrome's empty new-tab page with a fast, fully customizable start
page: a drag-and-drop grid of links, Google search, and productivity widgets. It's
privacy-first — no accounts, no servers, no tracking. Everything you create lives only
on your device.

This guide explains every feature and exactly how it works. Read it top to bottom for a
full tour, or jump to a section.

<!-- SCREENSHOT: A full new-tab dashboard — header with pinned links, a Google search,
     a couple of groups, and 2–3 widgets on a subtle wallpaper. This is the hero shot. -->
![The MonoStart dashboard — pinned links, search, groups, and widgets on one new-tab page](images/dashboard-overview.png)

---

## Table of contents

1. [The big picture](#1-the-big-picture)
2. [First launch](#2-first-launch)
3. [Edit mode — how customization works](#3-edit-mode--how-customization-works)
4. [The grid: adding, moving, and resizing](#4-the-grid-adding-moving-and-resizing)
5. [Links](#5-links)
6. [Groups (folders)](#6-groups-folders)
7. [The header bar & pinned links](#7-the-header-bar--pinned-links)
8. [Search](#8-search)
9. [Widgets](#9-widgets)
   - [Google Search](#google-search-widget)
   - [Todo List](#todo-list)
   - [Timers](#timers)
   - [Reminders](#reminders)
   - [Sticky Note](#sticky-note)
   - [Image](#image)
   - [Text Label](#text-label)
   - [Embedded Page](#embedded-page)
10. [The toolbar popup — "Save to MonoStart"](#10-the-toolbar-popup--save-to-monostart)
11. [Themes & appearance](#11-themes--appearance)
12. [Wallpapers (backgrounds)](#12-wallpapers-backgrounds)
13. [Settings](#13-settings)
14. [Clearing your dashboard](#14-clearing-your-dashboard)
15. [Removing Chrome's "Customized by" footer](#15-removing-chromes-customized-by-footer)
16. [Privacy & your data](#16-privacy--your-data)
17. [Quick reference](#17-quick-reference)
18. [FAQ & troubleshooting](#18-faq--troubleshooting)

---

## 1. The big picture

Every time you open a new tab, you land on **your dashboard**. It has three zones:

- **Header bar** (top) — the MonoStart logo, your **pinned links**, and the **Settings**
  (⚙️) menu on the right.
- **The grid** (center) — a flexible canvas where you place links, search, and widgets.
  Everything snaps to an invisible grid so it always stays tidy.
- **Background** — a solid color, gradient, or your own image, sitting behind everything.

Two modes:

- **Normal mode** — everything is live. Click links to open them, type in search, check
  off todos.
- **Edit mode** — drag, resize, add, rename, and delete things. Nothing is "live" while
  editing (clicking a link won't open it — it lets you drag it instead).

---

## 2. First launch

When you install MonoStart, a starter layout is created **once** with common Google
shortcuts pinned to the header (Gmail, Drive, Calendar, YouTube, Maps, Meet, Photos,
Keep) and a Google search in the grid. This only happens on a genuine fresh install —
updates never overwrite your layout, and if you ever clear your dashboard it won't be
re-seeded.

From there, make it yours: rearrange, delete what you don't use, and add your own links
and widgets.

> **Tip:** After installing from source, reload the extension once so saved-link icons
> render correctly.

---

## 3. Edit mode — how customization works

Almost all customization happens in **Edit mode**.

**To enter Edit mode:** click the **⚙️ Settings** icon (top-right) → **Edit Dashboard**.

While editing, the header shows three buttons:

| Button | What it does |
| --- | --- |
| **Clear** (red) | Wipes the whole dashboard (asks for confirmation first) |
| **Cancel** | Discards changes made in this editing session |
| **Save** | Saves your changes and returns to normal mode |

In Edit mode you can:

- Drag any item to a new spot.
- Resize widgets by dragging their bottom-right corner.
- Hover an item to reveal its controls (a "⋯" menu on links, a delete **✕** on widgets).
- Rename links and group titles inline.

When you're done, click **Save**. Click **Cancel** to throw away the session's changes.

<!-- SCREENSHOT: The dashboard in edit mode — show the Clear / Cancel / Save buttons in
     the header, and an item mid-drag or with its ✕ / ⋯ controls visible. -->
![Edit mode showing the Clear, Cancel, and Save buttons and an item's controls](images/edit-mode.png)

---

## 4. The grid: adding, moving, and resizing

The grid is a column-based layout. Items occupy a number of cells wide (**w**) and tall
(**h**), and everything snaps into place automatically — items reflow around each other
so you never get overlaps.

### Adding things

Open **⚙️ Settings** and choose:

- **Add Link** — add a single shortcut (see [Links](#5-links)).
- **Add Widget** — open the widget catalog (see [Widgets](#9-widgets)).

### Moving

In Edit mode, grab any item and drag it. Other items shuffle out of the way. Drop it
where you want.

### Resizing

In Edit mode, drag the **bottom-right corner** of a widget. Each widget has a sensible
minimum size so it never collapses into something unusable (for example, a Group is at
least 3×4 cells; the Reminders widget is at least 4×4).

---

## 5. Links

A **link** is a shortcut to a website, shown as a tile with the site's favicon.

### Adding a link

**⚙️ Settings → Add Link**, then paste or type a URL. You don't need to type `https://` —
MonoStart adds it for you. The site's name and icon are filled in automatically.

You can also save the page you're currently on straight from the toolbar — see
[the popup](#10-the-toolbar-popup--save-to-monostart).

### Link sizes (view modes)

In Edit mode, hover a link and click the **⋯** menu → **Size**:

- **Small (1×1)** — icon only. Hovering shows the name in a tooltip overlay.
- **Medium (3×1)** — icon plus the site name (and a description line if the tile is tall).

### The link "⋯" menu (Edit mode)

- **Rename** — give the link a custom display name. (You can also click the name to edit
  it inline on medium tiles.)
- **Size** — switch between Small and Medium.
- **Move to…** — send the link to the **Main Dashboard**, the **Header** bar, or into any
  **Group**.
- **Delete Link** — remove it.

### Opening links

Click a link in normal mode to open it. Whether it opens in the **same tab** or a **new
tab** is controlled by a global setting — see [Settings](#13-settings).

---

## 6. Groups (folders)

A **Group** is a colored, dashed-border container that organizes related links together —
think of it as a folder on your dashboard.

### Creating a group

**⚙️ Settings → Add Widget → Group**. A new group appears on the grid with an editable
title.

### Working inside a group

- **Rename:** click the title and type (Edit mode).
- **Add links:** click the **+** in the group header (Edit mode) and paste a URL. The link
  drops into the first free slot.
- **Rearrange:** drag link tiles around inside the group.
- **Drag links in or out:** drag a link from the main grid into a group, or drag one out
  of a group onto the main grid. You can also drag a **header-pinned link** onto a group
  to file it there.

### Group options (Edit mode)

From the group header you can:

- **Color** — pick from 12 preset colors (Red, Pink, Purple, Indigo, Blue, Cyan, Teal,
  Green, Yellow, Orange, Slate, Neutral). The color tints the border and title.
- **Columns** — set how many columns of links the group lays out internally.
- **Layout** — switch between **Grid** view (tiles) and **List** view (compact rows). In
  List view you reorder links by dragging them up and down.
- **Delete** — remove the group (and its links).

<!-- SCREENSHOT: A colored group with a few link tiles inside, header showing the title,
     + add button, color/columns/layout controls. Ideally one in grid view, one in list. -->
![A colored Group folder holding several links, with its header controls](images/group.png)

---

## 7. The header bar & pinned links

The header bar runs across the top of every new tab. Links **pinned** here are always
visible, no matter how you scroll the grid — ideal for the handful of sites you open
constantly.

### Pinning a link to the header

- From a link's **⋯ → Move to… → Header**, or
- When saving a page from the [popup](#10-the-toolbar-popup--save-to-monostart), choose
  **Header bar** as the destination.

### Reordering pinned links

In Edit mode, drag header links left/right to reorder them. Drag one onto a group to file
it inside that group instead.

---

## 8. Search

MonoStart keeps the familiar Google search experience front and center via the **Google
Search widget**.

As you type, you get a live dropdown that blends two sources:

- **Your browsing history** — recently visited pages matching what you typed (shown with
  the site's favicon and a 🕘 history icon). Read entirely **on your device**.
- **Google autocomplete** — live search suggestions from Google.

Other behaviors:

- **Type a URL** (e.g. `github.com`) and press Enter to go straight there; type anything
  else to search Google.
- **Keyboard:** ↑/↓ to move through suggestions, Enter to go, Esc to dismiss.
- **🎙️ Voice search** — click the mic, speak, and MonoStart runs the search. (Requires
  your browser's speech recognition; you'll be asked for mic permission the first time.)
- **📷 Google Lens** — search by image.

See the [Google Search widget](#google-search-widget) for layout options.

---

## 9. Widgets

Add any widget via **⚙️ Settings → Add Widget**. Below is what each one does and how to
use it. All widget data is stored locally on your device.

### Google Search widget

The search bar described in [Search](#8-search). In Edit mode you can switch its layout:

- **Bar only** — just the search bar (1 row tall).
- **Show logo** — adds a large "Google" wordmark above the bar (4 rows tall). Click the
  logo to toggle between **color** and **monochrome** styles.

### Todo List

A quick checklist for the day. Add tasks, check them off, and remove them. Great for a
running list you see every time you open a tab.

### Timers

Run **multiple labeled countdowns** at once — e.g. a "Tea" timer and a "Standup" timer
side by side. Start, pause, and reset each independently.

### Reminders

Scheduled reminders that fire as **browser notifications** even when no tab is open. This
is the most powerful widget — here's how it works:

**Creating a reminder:**

1. Type what you want to be reminded of ("Remind me to…").
2. Pick a **date and time** with the date/time picker.
3. Choose how it **repeats**:
   - **Once** — fires a single time (it gets a checkbox so you can mark it done).
   - **Every 30 min**, **Hourly**, **Daily**, **Weekly** — recurring on a fixed cadence.
   - **Custom** — every N minutes, hours, or days (1 minute up to 365 days).
4. Click **+** to add it.

**When a reminder is due, MonoStart:**

- Adds a **red badge count** on the MonoStart toolbar icon.
- Plays a **chime** (so you're alerted even if Chrome's notifications are muted by Focus
  / Do Not Disturb).
- Shows a **system notification** (if you've granted notification permission).
- Pops open the toolbar popup with the due reminder, when possible.

Reminders fire to **the second** thanks to precise one-shot scheduling, with a background
safety check every few minutes as a backstop. Recurring reminders automatically advance to
their next due time after firing.

**Managing reminders:**

- Overdue items are highlighted in red.
- One-time reminders have a checkbox; recurring ones show a 🔁 repeat icon.
- Hover a reminder and click **✕** to delete it.
- When reminders fire, you can dismiss them one-by-one or **Clear all** from the popup.

<!-- SCREENSHOT: The Reminders widget — a few reminders (one overdue/red, one recurring
     with the 🔁 icon) plus the add row with the date/time picker and recurrence dropdown open. -->
![The Reminders widget with scheduled and overdue reminders and the recurrence picker](images/reminders.png)

### Sticky Note

A free-text note you can color. Jot down anything you want visible at a glance. Pick a
note color to match your theme or to color-code different notes.

### Image

Add an image to your dashboard — either by **pasting an image URL** or **uploading a local
file**. Useful for a mood board, a logo, a photo, or a visual divider. You can choose how
the image fits its tile (cover / contain / fill) and resize the tile freely.

### Text Label

A clean floating heading to title and section your grid (e.g. "Work", "Personal",
"Reading"). Customize the **text**, **alignment** (left / center / right), **size**,
**weight**, and **opacity**. Labels have no background by default, so they sit lightly over
your layout.

### Embedded Page

Pin **any website as a live widget** — a mini live view of a page (a dashboard, a calendar,
a clock site, etc.) embedded right on your new tab. Note that some sites block being
embedded; those won't display (that's the site's choice, not a MonoStart limitation).

---

## 10. The toolbar popup — "Save to MonoStart"

Click the **MonoStart icon** in Chrome's toolbar to open the popup. It does two things:

**1. Save the current page.** It shows the page you're on (title + site). Choose a
**destination**:

- **Main dashboard** — adds it as a tile on the grid.
- **Header bar** — pins it to the header.
- **Any Group** — files it directly into one of your groups.

Click **Save Link** and it's added instantly. **Open Dashboard** opens a new tab with your
dashboard.

<!-- SCREENSHOT: The toolbar popup — current page preview, the Destination dropdown
     (Main dashboard / Header bar / a group), and the Save Link button. -->
![The Save to MonoStart toolbar popup with the destination picker](images/popup.png)

**2. Show due reminders.** If any reminders have fired, they appear at the top of the
popup in red. Dismiss them individually or **Clear all**.

---

## 11. Themes & appearance

Open **⚙️ Settings → Theme & Appearance**.

**Theme mode:**

- **Light** — always light.
- **Dark** — always dark.
- **Device** — follows your operating system's light/dark setting automatically.

**Primary color:** pick from a set of preset accent colors, or click the rainbow swatch to
choose a **custom hue** with a slider. The accent color tints buttons, highlights, and
selection states throughout the dashboard (and the popup).

<!-- SCREENSHOT: The Theme & Appearance modal — Light/Dark/Device toggle, primary color
     swatches with the custom-hue slider, and the Background section with blur/dim sliders. -->
![The Theme & Appearance panel with mode toggle, color presets, and background options](images/theme-panel.png)

---

## 12. Wallpapers (backgrounds)

In the same **Theme & Appearance** panel, set what sits behind your dashboard:

- **None** — clean solid theme background.
- **Color** — pick from a palette of deep solid colors.
- **Gradient** — choose a preset gradient (Dusk, Sunset, Ocean, Forest, Slate, Aurora).
- **Image** — paste an image URL or **upload your own** (must be under 1.5 MB).

For Color, Gradient, and Image backgrounds you also get two sliders:

- **Blur** (0–20px) — softens the background so widgets stay readable.
- **Dim** (0–70%) — darkens the background for contrast.

When a wallpaper is set, the header and widgets adapt with subtle translucency so
everything stays legible.

---

## 13. Settings

Found in the **⚙️ Settings** menu:

- **Add Link** / **Add Widget** — covered above.
- **Edit Dashboard** — enter Edit mode.
- **Theme & Appearance** — themes and wallpapers.
- **Open links in new tab** — toggle. When **on**, clicking any link opens it in a new
  tab; when **off**, links open in the current tab.

---

## 14. Clearing your dashboard

In Edit mode, the red **Clear** button wipes your entire dashboard. You'll be asked to
confirm first — this can't be undone. After clearing, MonoStart will **not** re-seed the
starter layout; you start from a blank canvas.

---

## 15. Removing Chrome's "Customized by" footer

Because MonoStart replaces your new tab page, Chrome shows a small **"Customized by
MonoStart"** footer and a *Customize Chrome* side panel. That's browser UI, not part of
MonoStart. On first launch MonoStart shows a short, one-time guide to help you turn that
footer off if you'd like a cleaner look. It detects when you've hidden the footer and
quietly gets out of the way once you have.

---

## 16. Privacy & your data

MonoStart is built **privacy-first**:

- **No accounts, no servers, no analytics, no tracking, no ads.**
- Your layout, links, notes, todos, timers, and reminders are stored **locally on your
  device** — never uploaded, because there is no backend to upload to.
- The only data that leaves your browser is what you **type into the search box** (sent to
  Google for autocomplete, exactly like a normal search bar) and content you explicitly add
  (embedded pages and images load from their own source).
- Your **browsing history** is read **only on your device** to power search suggestions —
  it never leaves your machine.

Because your data is local, it stays on the machine where you created it and isn't synced
across devices.

---

## 17. Quick reference

| I want to… | Do this |
| --- | --- |
| Customize anything | ⚙️ Settings → **Edit Dashboard** |
| Add a shortcut | ⚙️ Settings → **Add Link** |
| Add a widget | ⚙️ Settings → **Add Widget** |
| Save the page I'm on | Click the **MonoStart toolbar icon** → pick a destination → **Save Link** |
| Pin a link to the top bar | Link's **⋯ → Move to… → Header** |
| Make a folder | Add Widget → **Group** |
| Resize a link | Link's **⋯ → Size** (Small / Medium) |
| Resize a widget | Edit mode → drag its **bottom-right corner** |
| Set a reminder | Add the **Reminders** widget → type, pick time, choose repeat, **+** |
| Change light/dark | ⚙️ Settings → **Theme & Appearance** → mode |
| Set a wallpaper | ⚙️ Settings → **Theme & Appearance** → Background |
| Open links in new tabs | ⚙️ Settings → toggle **Open links in new tab** |
| Start over | Edit mode → **Clear** |

---

## 18. FAQ & troubleshooting

**Will my dashboard sync to my other computers?**
No. Everything is stored locally on each device, by design. There's no account or cloud.

**An embedded page is blank — what's wrong?**
Some websites refuse to be embedded in other pages (a setting on their end). Those can't be
displayed as Embedded Page widgets. Try a different site or use a regular link instead.

**My reminder didn't show a notification.**
The badge and chime always fire. System notifications only appear if you've granted Chrome
notification permission and your OS isn't suppressing them (Focus / Do Not Disturb). Check
the toolbar popup — due reminders are listed there too.

**Voice search isn't working.**
Voice search uses your browser's built-in speech recognition and needs microphone
permission. Allow the mic when prompted. If your browser doesn't support it, MonoStart falls
back to Google's voice search page.

**Link icons aren't showing (fresh install from source).**
Reload the extension once in `chrome://extensions` so the favicon permission takes effect.

**I cleared my dashboard by accident.**
Clearing can't be undone, and the starter layout won't come back automatically. You'll need
to re-add your links and widgets.

**Did I lose my layout after an update?**
No — updates never overwrite your dashboard. Your layout is preserved across extension
updates.

---

*MonoStart — a private, customizable new-tab dashboard. Built by
[Paurush Rai](https://www.paurushrai.in).*

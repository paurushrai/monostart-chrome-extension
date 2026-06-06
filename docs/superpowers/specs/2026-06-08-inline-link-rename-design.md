# Inline Link Rename — Design

**Date:** 2026-06-08
**Status:** Approved

## Problem

Renaming a link card invokes `window.prompt` (a Chrome alert-style input box) in both
`LinkCard.tsx` and `HeaderLink.tsx`. The rename should happen *inside the card itself*:
clicking "Rename" should turn the card's name display into an editable field in place.

## Goal

Replace the `window.prompt` rename flow with an inline, in-card editable field across all
link card sizes and the header links. `Change URL` (HeaderLink) keeps its prompt — out of scope.

## Mechanism (shared pattern, both components)

- Add local state: `isRenaming: boolean` and a controlled `draftName: string`.
- The "Rename" menu item sets `isRenaming = true`, seeds `draftName` with the current
  `siteName`, and closes the dropdown — instead of calling `window.prompt`.
- While `isRenaming`, an auto-focused `<input>` (text pre-selected on focus) replaces the
  name display.
- **Commit** on `Enter` or `blur`: if the trimmed draft is non-empty and changed, call
  `onUpdateItem(item.id, { customName: trimmed })`. Then `isRenaming = false`.
- **Cancel** on `Escape`: discard draft, `isRenaming = false`.
- The input stops propagation on `mouseDown`/`click` so it does not start a drag or follow
  the link. The wrapping `<a>` already calls `preventDefault` on click while in edit mode.

## LinkCard.tsx

- **Icon-only (`item.w === 1`):** the rename input *is* the hover-text overlay
  (currently `LinkCard.tsx:304-310`). Same centered styling
  (`bg-background/70 backdrop-blur-md`, small bold centered text), but rendered
  always-visible, `pointer-events-auto`, and editable while `isRenaming`. The plain hover
  overlay continues to render only when `!isEditing && !isRenaming`.
- **Medium / large:** the input replaces the `<h4>` title inline, matching its typography.
- The existing click-to-edit `contentEditable` `<h4>` (LinkCard.tsx:279-288) stays as-is —
  Rename becomes a second, explicit entry point. While `isRenaming`, the `<h4>` is swapped
  for the input.
- Remove `handleRename`'s `window.prompt` usage.

## HeaderLink.tsx

- **Text mode (`viewMode === 'text'`):** the input replaces the name span inline. The pill
  already flexes up to `max-w-[160px]`.
- **Icon mode:** the 28px pill is too small for an in-box field. While `isRenaming`, render
  the text-mode inline input (pill sized like text mode) regardless of `viewMode`; after
  commit/cancel, the pill reverts to its stored icon view. `viewMode` in storage is **not**
  changed — only the render during rename.
- Remove rename's `window.prompt`. `Change URL` prompt is untouched.

## Data / state

No type or storage changes. `customName` already exists on `LinkItem` (types.ts) and the
update flows through the existing `onUpdateItem` → `handleUpdateLink` → `saveItems` path.

## Testing

- Icon-only LinkCard: Rename shows editable overlay, Enter saves, Escape cancels, blur saves.
- Medium/large LinkCard: Rename focuses inline input, save/cancel paths work; click-to-edit
  `<h4>` still works independently.
- HeaderLink text mode: inline input save/cancel.
- HeaderLink icon mode: input appears text-sized, reverts to icon after, `viewMode` unchanged.
- Empty / whitespace-only input does not overwrite the name.
- No drag starts and no navigation occurs when interacting with the input in edit mode.

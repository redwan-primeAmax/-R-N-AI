# Refactor Todo — Navigation, Settings, AI Config, Vault, Editor

## Step 1 — Navigation Bar & Headers
- [x] Create shared `Navigation2` component (Back + Home buttons)
- [x] Remove page headers from all sub-pages; keep Advanced Control root header
- [x] Apply Navigation2 to: Tools, Content Architect, Templates, AI Config,
      Backup (ex-Cloud Archive), Data Monitor, Recent Backups, Recycle Bin,
      Bookmarks, Vault, Workspace, Search, Graph

## Step 2 — Tools Section Cleanup
- [x] Keep only AI Content Architect + Templates cards
- [x] Icon left / title right layout; remove hero, badges, workflow, extra text
- [x] Remove coming-soon card

## Step 3 — Advanced Control (ex-Settings)
- [x] Rename Settings → Advanced Control (title, sidebar, references; en+bn)
- [x] Language selector only in Preferences; remove header chip + overview tile
- [x] Fix Bengali sidebar "Agent" translation
- [x] Remove Recycle Bin tile from Advanced Control data blocks
- [x] Rename Cloud Archive → Backup (labels; route kept)
- [x] Backup download must record into Recent Backups (no "no records")

## Step 4 — AI Configuration
- [x] Pre-load default model `gemini-3.5-flash-lite`
- [x] Provider switching must NOT mark unsaved / trigger exit modal
- [x] Hide: Gemini/OpenRouter key links, GitHub Pages notice, System Prompt block

## Step 5 — Unsaved Changes Modal
- [x] "Go Back" on top (green), "Discard / Leave" at bottom

## Step 6 — Animation Glitches (Chromium)
- [x] Workspace cards/modules: remove layout-animation flicker
- [x] Sidebar drawer: GPU-smooth open/close
- [x] Home search bar: clean single redirect, no blank/artifact flash

## Step 7 — Security Vault
- [x] Single status line: "পিন পাসওয়ার্ড সুরক্ষিত · Local" (localized)
- [x] Verify/enforce vault encryption gating (locked notes stay encrypted,
      no access without authorization)

## Step 8 — Editor
- [x] Restore three-dots menu in editor header (opens action sheet)
- [x] Sub-page chips open a smooth partial-screen overlay; open from there
- [x] Keep code modular; no layout regressions

## Verification
- [x] `./node_modules/.bin/tsc --noEmit` passes
- [x] `npm run build` passes
- [x] Translator en/bn parity passes
- [x] Dev-server smoke test on touched routes (200)
- [x] Temporary test files deleted

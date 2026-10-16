# Redesign & Localization Todo

Research notes applied: dark-first calm UI, one consistent design system
(8px spacing rhythm, same header/card/button language on every page),
clear visual hierarchy, large touch targets, steps shown as a visible
workflow with status, and progressive disclosure instead of clutter.
Sources: 2026 mobile UI trend roundups (dark-first, calm/low-stimulus UI,
thumb-friendly actions) and Notion-style productivity layout breakdowns
(consistent card system, hierarchy, generous spacing).

## 1. Tools Page — complete rewrite
- [x] Rewrite the whole page UI code from scratch (not a restyle)
- [x] Header must belong to the same design system as the page body
- [x] One accent color, one card style, one button style across the page
- [x] Tool cards: icon, title, description, badge, clear call-to-action
- [x] Coming-soon area in the same visual language
- [x] Every visible string through the translator (en/bn)

## 2. AI Content Architect — redesign every element + Step-2 bug
- [x] Redesign header, step cards, target list, JSON editor, preview, CTA
- [x] Visible step progress (1 → 2 → 3) with status indicators
- [x] BUG: selecting "New Independent Page" in Step 2 must also show the
      instruction/request box and enable "Copy full prompt" (today it only
      appears when an existing page is selected)
- [x] Full-prompt copy must work for: new page, sub-page, existing page
- [x] Every visible string through the translator (en/bn)

## 3. Language — 100% English / 100% Bengali
- [x] English selected → no Bengali UI text anywhere
- [x] Bengali selected → no English UI text anywhere
- [x] Sweep every page/component/modal/hook with hardcoded strings
- [x] All strings live in `src/utils/translator.ts` (en + bn parity)
- [x] Automated scan: no hardcoded Bengali literals outside translator,
      no hardcoded English UI strings in rewritten pages
- [x] Language switch re-renders live without reload (existing event)

## 4. Verification
- [x] `./node_modules/.bin/tsc --noEmit` passes
- [x] `npm run build` passes
- [x] Dev-server smoke test on Tools + Architect + Settings pages
- [x] Temporary test files deleted afterwards

Notes (intentional, not UI leaks):
- Remaining Bengali literals outside the translator are limited to the
  Bengali search-normalization map in `RSTSearch/core/Tokenizer.ts`, the
  Bengali label dictionary in `BlockMenu.tsx` (used only when Bengali is
  active), AI system-prompt text, and unused fallback constants.
- Verified: 594 en keys = 594 bn keys, no duplicates, 0 Bengali lines
  inside the English dictionary (except the intentional native language
  name "বাংলা"), `tsc --noEmit` clean, production build passed, and all
  tested routes/modules returned HTTP 200.

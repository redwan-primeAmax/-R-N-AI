# Redesign V2 Todo — Tools & AI Content Architect

Goal: completely redesign the code of the pages previously asked to be made
beautiful — not a color tweak. New shared "Midnight Aurora" design system:
deep-space background, aurora gradient glows, glass panels, gradient
primary actions, large hero typography, bento/workflow layouts.

## 1. Tools Page (`src/pages/Tools/ToolsPage.tsx`)
- [x] Rewrite the entire page code with the new design system
- [x] New hero panel + bento grid layout (different structure from V1)
- [x] Featured AI Content Architect card with visual workflow
- [x] Templates + coming-soon cards in the same language
- [x] All strings via translator (en/bn parity for any new key)

## 2. AI Content Architect (`src/pages/AI/AIContentArchitect.tsx`)
- [x] Rewrite the entire JSX with the new design system (logic preserved)
- [x] New header + horizontal step tracker
- [x] Step cards redesigned: prompt studio, target picker, JSON terminal
- [x] KEEP FIX: instruction box + Copy Full Prompt always visible/working
      for New Independent Page, sub-page, and existing page
- [x] Preview + import CTA redesigned; status toast redesigned
- [x] All strings via translator (en/bn parity for any new key)

## 3. Templates (`src/pages/Templates/BrowseTemplates.tsx`)
- [x] Restyle to the same new design system so Tools flow does not clash

## 4. Verification
- [x] `./node_modules/.bin/tsc --noEmit` passes
- [x] `npm run build` passes
- [x] Translator en/bn parity check passes
- [x] Dev-server smoke test: /, /tools, architect, /template routes 200
- [x] Temporary test files deleted afterwards

Verified: `tsc --noEmit` clean, production build passed, translator
609 en = 609 bn keys (no duplicates/missing), no Bengali literals in the
three redesigned pages, dev-server smoke test `/`, `/tools`,
`/external-ai-import`, `/template` + touched modules all HTTP 200.
Step-2 fix preserved: instruction textarea and Copy Full Prompt render
unconditionally and `handleCopyFullPrompt` covers new page / sub-page /
existing page.

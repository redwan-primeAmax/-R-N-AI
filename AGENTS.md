# Project Design Guidelines

- **Navigation Bar Texture**: The texture layer in `Navigation.tsx` (`/textures/navbar_icon.png`) MUST always be kept at `opacity-100` with no mix-blend modes. It should be the primary visual background for the navigation menu.
- **Note Card Texture**: The texture layer in `NoteCard.tsx` (`/textures/web_note_card_bg.png`) MUST always be kept at `opacity-100` with no mix-blend modes.
- **Visual Polish**: Do not lower the opacity or add experimental blending to these core textures unless specifically requested by the user. These are intended to be high-visibility tactile finishes.

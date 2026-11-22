# FlightMath — Design Contract

> Train your mind. Calculate faster. Think like a pilot.

This document is the single source of truth for FlightMath's visual and interaction language. It was written **before** any UI was implemented and must be consulted for every screen, component and animation.

---

## 1. Aesthetic direction

**Warm Editorial × Liquid Glass × Apple-inspired aviation training.**

The product should feel like a premium, custom-designed training instrument, not a SaaS dashboard, school LMS, gaming site or childish mascot app. The emotional register is calm, warm, tactile and precise: early-morning hangar light, amber instrument glow, cream paper, deep espresso surroundings.

Visual references translated into an original system:

- Warm amber glass, glowing translucent surfaces, floating controls, large typography and cinematic composition.
- Full-screen warm gradient fields, soft lighting, black silhouettes, translucent glass panels and editorial typography.

Design principles:

1. **Type leads.** Hierarchy comes from scale and weight, not boxes and borders.
2. **Warmth everywhere.** Every surface is brown, amber, sand, ivory or cream. Never purple, violet or indigo.
3. **Glass is an accent, not wallpaper.** Use blur/translucency only where depth or focus is meaningful.
4. **Asymmetry over grids.** Editorial compositions, varied module sizes, generous negative space.
5. **Motion with intent.** Springy, restrained, purposeful. Never bouncy or cartoonish.
6. **Focused learning.** Question screens strip away everything but the maths and the next right action.

Forbidden: generic three-card KPI rows, centered-everything heroes, gradients on every component, 0.1-opacity shadow soup, rounded cards on everything, blue primary buttons, dark-mode-only thinking, childish confetti storms.

---

## 2. Fonts

Loaded locally via `@fontsource-variable/manrope`, `@fontsource-variable/dm-sans` and `@fontsource/jetbrains-mono` so the app works offline.

| Role | Family | Weights | Usage |
| --- | --- | --- | --- |
| Display | Manrope Variable | 200–800 | Headlines, numbers in hero positions, node labels |
| Body | DM Sans Variable | 400–700 | Explanations, UI copy, buttons |
| Mono | JetBrains Mono | 400–700 | All numerical operands, answers, timers, formulas |

CSS aliases: `--font-display`, `--font-body`, `--font-mono`.

Forbidden fonts: Inter, Roboto, Open Sans, Arial, system-ui (also as fallbacks). Fallbacks are generic `sans-serif` / `monospace` only.

---

## 3. Color palette

### Core tokens (CSS variables)

| Token | Hex | Meaning |
| --- | --- | --- |
| `--obsidian` | `#191714` | Deepest background |
| `--espresso` | `#30251F` | Dark surface |
| `--deep-brown` | `#473027` | Raised dark surface |
| `--burnt-sienna` | `#A65F3D` | Strong accent |
| `--warm-amber` | `#D78D60` | Primary accent |
| `--soft-gold` | `#E9B879` | Highlight accent |
| `--warm-sand` | `#F0E4D1` | Muted light text / pale surface |
| `--ivory` | `#F7F4EF` | Primary light surface / text |
| `--success` | `#8FA98B` | Muted sage |
| `--error` | `#D98476` | Muted coral |
| `--inactive` | `#9A8E82` | Warm grey |
| `--cream` | `#FFF9EF` | Subtle highlight |

Supporting derived variables (RGB channel mirrors for Tailwind alpha):

`--canvas-rgb`, `--surface-rgb`, `--elevated-rgb`, `--inset-rgb`, `--ink-rgb`, `--muted-rgb`, `--faint-rgb`, `--accent-rgb`, `--amber-rgb`, `--gold-rgb`, `--success-rgb`, `--error-rgb`.

Semantic aliases: `--accent`, `--accent-soft`, `--accent-ring`, `--border`, `--border-strong`, `--glass`, `--glass-strong`, `--glass-border`, `--glass-highlight`, `--glow`, `--shadow-float`.

### Themes

- **Dark (default):** obsidian canvas, espresso/deep-brown glass, ivory text, amber accents.
- **Light:** ivory/sand canvas, cream glass, espresso text, burnt-sienna accents.
- **System:** follows `prefers-color-scheme`, stored as `data-theme="system"` with a resolved `data-theme-resolved` attribute.

No purple/indigo hues in either theme. Success is sage, error is coral.

---

## 4. Spacing & layout

- Base rhythm: **8px** (`1, 2, 3, 4, 6, 8, 10, 12, 16` units = 4–128px).
- Page gutters: mobile 20px, tablet 32px, desktop 48–64px.
- Section rhythm: 40px mobile, 64px tablet, 88px desktop.
- Max content width: 1240px; reading measure 62–72ch.
- Safe-area insets respected on all fixed chrome.
- Avoid three equal cards in a row. Use a large feature module plus supporting modules of different sizes, or editorial stacked rows.

### Breakpoints

| Name | Width | Navigation |
| --- | --- | --- |
| Mobile | < 768px | Bottom tab bar + More sheet, full-screen sessions |
| Tablet | 768–1179px | Slim icon rail + expansive content |
| Desktop | ≥ 1180px | 248px sidebar rail with labels, keyboard shortcuts |

Desktop layouts are intentionally different: wider path canvas, two-column lesson/example splits, analytics side panel. Mobile is never merely stretched.

---

## 5. Typography hierarchy

| Level | Font | Size / line-height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Display | Manrope | clamp(2.75rem, 7vw, 5.5rem) / 0.98 | 300 or 800 | -0.045em |
| H1 | Manrope | clamp(2rem, 4vw, 3.25rem) / 1.06 | 700 | -0.035em |
| H2 | Manrope | 1.5–2rem / 1.15 | 700 | -0.025em |
| H3 | Manrope | 1.125–1.35rem / 1.25 | 700 | -0.015em |
| Eyebrow | DM Sans | 0.6875rem / 1 | 600 | 0.18em uppercase |
| Body | DM Sans | 0.9375–1.0625rem / 1.6 | 400–500 | 0 |
| Quiet | DM Sans | 0.8125rem / 1.5 | 400 | 0.01em |
| Number | JetBrains Mono | 1.25–4rem | 500–700 | -0.03em |

Extreme weight contrast is intentional: thin 200/300 display text beside heavy 800 words; quiet 300 micro-copy beside dense numbers.

---

## 6. Buttons

Primary button language: **transparent with thin matching border and 25px radius.**

| Variant | Style |
| --- | --- |
| `outline` (default) | Transparent bg, 1px `--border-strong`, text `--ink`, radius 25px |
| `accent` | Transparent bg, 1px amber border, amber text |
| `primary` | Ivory or warm-amber bg, obsidian text, radius 25px |
| `ghost` | No border, no bg, muted text; used for Skip |
| `glass` | Translucent blur surface, illuminated border; only on immersive screens |
| `danger` | Coral border + coral text; only for destructive confirmations |

Rules:

- Border color always matches text color family.
- Height: 44px mobile minimum, 40px compact, 52px primary CTA.
- Press: `scale(0.97)` + subtle brightness shift, 160ms.
- Hover: border brightens, background tint at most 6% opacity.
- Focus ring: 2px amber ring with 3px offset.
- No blue buttons, no hard drop shadows, no gradients inside buttons.

---

## 7. Surfaces & glass

- **Base canvas:** atmospheric radial gradients (amber and sienna glow at low opacity) over obsidian; fine grain overlay from inline SVG noise.
- **Glass panel:** `background: var(--glass)`, `backdrop-filter: blur(24px) saturate(140%)`, `border: 1px solid var(--glass-border)`, inset top highlight via `box-shadow: inset 0 1px 0 var(--glass-highlight)`.
- **Solid panel:** warm espresso/sand with 1px warm border; used for dense data areas.
- **Inset well:** darker/lighter recessed area for answer input and code-like displays.
- **Radius system:** 6px small chips, 14px inputs/tiles, 20px panels, 25px buttons/pills, 999px avatars/nodes. Not everything is rounded.
- **Shadow:** one soft float shadow for elevated glass; never stacked translucent shadows.

Glass must never reduce contrast below 4.5:1 for body text. When in doubt, add a solid scrim behind text.

---

## 8. Animation principles

Library: Framer Motion (already used across the existing projects) plus CSS transitions for hover/focus.

- Spring: `stiffness 320–420`, `damping 28–36`, `mass 0.8–1`.
- UI transitions: 180–260ms ease-out.
- Page transitions: crossfade + 8px vertical lift, 220ms.
- Number transitions: count-up/roll using tabular-nums in JetBrains Mono.
- Feedback: correct = sage ring pulse + number rise; incorrect = coral shake (4px, 2 cycles) + gentle explanation reveal.
- Progress: stroke-dashoffset / width interpolation; no jumpy fills.
- Path nodes: staggered unlock scale + glow bloom.
- Achievements: restrained radial shimmer + 6–10 drifting embers, 900ms.
- Confetti only for rank-up / final exam completion, muted amber/gold/sage, never more than ~40 pieces.
- Respect `prefers-reduced-motion` and the in-app Reduced Motion setting: replace all transforms with opacity-only, disable autoplay animations and confetti.

---

## 9. Responsive rules

- Mobile first: 20px gutters, 44px targets, full-bleed immersive onboarding, bottom nav with safe-area padding.
- Question screen: single column, answer input above the fold, actions pinned near thumb.
- Tablet: path map and lessons use wider canvases; concept + worked example can sit side by side.
- Desktop: persistent sidebar, command palette (`⌘K` / `Ctrl+K`), keyboard shortcuts for answer submit (`Enter`), hints (`H`), skip (`S`), learn (`L`).
- Charts are custom SVG so they scale cleanly and stay on-brand.

---

## 10. Existing component library & exact import paths

This is a new dedicated project; conventions are adapted from `flightdeck-study` and `aether`:

- UI primitives: `src/components/ui/*` (Button, Card, Badge, Progress, Modal, EmptyState, Toast, Tabs).
- Layout: `src/components/layout/*` (Sidebar, TopBar, BottomNav, Brand, CommandPalette).
- App shell & routing: `src/app/App.tsx`, `src/app/AppShell.tsx`.
- State: `src/stores/useAppStore.ts` (Zustand), `src/stores/useUiStore.ts`.
- Persistence: `src/lib/db.ts` (Dexie), `src/lib/repositories.ts`.
- Icons: `lucide-react` (`import { Gauge } from 'lucide-react'`).
- Motion: `framer-motion` (`import { motion, AnimatePresence } from 'framer-motion'`).
- Utility classes: `clsx` (`import clsx from 'clsx'`).
- Charts: custom SVG in `src/components/charts/*`, no chart library.
- Question engine: `src/features/questions/*`; curriculum `src/data/curriculum/*`; tricks `src/data/tricks/*`; formulas `src/data/formulas/*`.
- Tests: Vitest (`npm test`).

Tailwind semantic classes come from `tailwind.config.js` and map to the CSS variables above. Use them rather than raw hex values in components.

---

## 11. Forbidden design patterns (explicit checklist)

- No purple, violet, indigo or blue primary UI.
- No Inter / Roboto / Open Sans / Arial / system-ui font stacks.
- No generic three-card KPI row or dashboard template.
- No centered hero on every page.
- No excessive borders, dividers, shadows or rounded cards.
- No gradients on every element; no neon glow overload.
- No unsupported claims that content is official IndiGo/ADAPT material. All generated content is labelled **FlightMath practice material**.
- No fake analytics, dead controls, placeholder pages or lorem ipsum.
- No motion that ignores reduced-motion preferences.

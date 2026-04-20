# Procurement Management System – Design System

This design system is derived from your existing codebase. It documents tokens, patterns, and guidelines to keep the UI consistent.

---

## Brand & Context

- **Product:** Procurement Management System
- **Context:** Government / DILG (Department of the Interior and Local Government)
- **Primary users:** BAC staff, administrators, personnel
- **Tone:** Professional, trustworthy, clear, government-ready

---

## Color Palette

### Primary (DILG Branding)

The app uses DILG (Department of the Interior and Local Government) branding colors across Login and the main app.

| Role | Hex | Usage |
|------|-----|-------|
| Primary | `#D4140F` | Buttons, links, active states, logo |
| Primary hover | `#b0100c` | Button hover |
| Primary dark | `#8c0c09` | Active/pressed |
| Primary muted | `#fef2f2` | Active nav, soft backgrounds |
| Primary light | `#fecaca` | Hover backgrounds |

### Neutral Palette (Shared)

From your `index.css`:

| Token | Hex | Usage |
|-------|-----|-------|
| `--surface` | `#ffffff` | Cards, sidebar, inputs |
| `--background` | `#f1f5f9` | Page background |
| `--background-subtle` | `#e2e8f0` | Hover, section headers |
| `--border` | `#cbd5e1` | Borders, dividers |
| `--border-light` | `#e2e8f0` | Subtle borders |
| `--text` | `#0f172a` | Primary text |
| `--text-muted` | `#475569` | Secondary text |
| `--text-subtle` | `#64748b` | Labels, placeholders |

### Status Colors (semantic, document state)

| Status | Background | Text | Usage |
|--------|------------|------|-------|
| Completed | `#dcfce7` | `#15803d` | Badges, stat cards |
| On-going | `#fef3c7` | `#92400e` | Badges, stat cards |
| Pending | `#ffe4e6` | `#be123c` | Badges, stat cards |
| Total / neutral | `#64748b` | — | Stat card accent |

---

## Typography

| Element | Font | Size | Weight | Notes |
|---------|------|------|--------|-------|
| Body | Plus Jakarta Sans | 15px | 400 | `index.css` |
| Page title | Plus Jakarta Sans | 1.25–1.5rem | 700 | `.page-title`, `.page-title-lg` |
| Page subtitle | Plus Jakarta Sans | 0.875rem | 400 | `.page-subtitle` |
| Section header | Plus Jakarta Sans | 1rem | 600 | Section titles |
| Nav label | Plus Jakarta Sans | 11px | 600 | Uppercase, letter-spacing |
| Table header | Plus Jakarta Sans | 11–12px | 600 | Uppercase |
| Badge | Plus Jakarta Sans | 12px | 500 | Rounded pills |

**Font stack:** `'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

---

## Spacing & Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | 0.75rem | Cards, modals |
| `--radius-sm` | 0.5rem | Buttons, inputs |
| `--radius-lg` | 1rem | Large cards |
| `--radius-xl` | 1.25rem | Extra emphasis |

**Sidebar:** 16rem (256px) width, fixed on md+  
**Main content padding:** 1rem mobile → 2rem desktop  
**Card gap:** 1–1.5rem between cards  
**Stat grid:** 1 col → 2 cols (sm) → 4 cols (lg)

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow` | 0 1px 3px… | Default cards |
| `--shadow-md` | 0 4px 6px… | Hover, elevated |
| `--shadow-lg` | 0 10px 25px… | Modals, dropdowns |
| `--focus-ring` | 0 0 0 3px rgb(13 148 136 / 0.25) | Focus states |

---

## Components (from your code)

### Buttons

- **Primary:** `.btn-primary` – solid primary color, white text, 0.625rem / 1.25rem padding  
- **Secondary:** `.btn-secondary` – white bg, border, hover darkens border  
- **Action (text):** `.btn-action`, `.btn-action-primary`, `.btn-action-secondary` – inline, icon + text  

### Cards

- **Default:** `.card` – white bg, light border, small shadow  
- **Elevated:** `.card-elevated` – stronger border/shadow  

### Form Fields

- **Input:** `.input-field` – full width, 0.5rem 1rem padding, border radius `--radius-sm`  

### Tables

- **Header:** `.table-header`, `.table-th` – uppercase, muted text  
- **Cell:** `.table-td`, `.table-td-muted`  

### Badges

- Status pills: `badge-ongoing`, `badge-complete`, `badge-pending`  
- Rounded, inline-flex, 0.25rem 0.5rem padding  

---

## Layout Patterns

### Page structure

1. **Page header** – `.page-header` with title + subtitle  
2. **Content** – stat cards, cards, tables, toolbars  
3. **Empty state** – `.empty-state` (centered, muted text)  

### Sidebar

- Logo: green circle with "B"  
- Title: "Bids and Awards Document Tracking"  
- MENU section: Dashboard, Encode, Reports, Personnel, Settings  
- Admin section: User name, Logout, current URL  

### Mobile

- Top bar: menu toggle + logo + title  
- Sidebar: slide-in drawer, backdrop overlay  
- Content: `pt-14` for top bar  

---

## Motion

- Transition: `duration-300 ease-out`  
- Hover: `scale-105`, `scale-110` for icons  
- Active: `scale-[0.98]` for buttons  

---

## Accessibility

- Focus ring: `var(--focus-ring)` for keyboard focus  
- `aria-label` on icon-only buttons (e.g. menu toggle)  
- Semantic HTML: `<main>`, `<nav>`, `<header>`  
- Color contrast: ensure 4.5:1 for body text, 3:1 for large text  

---

## Implementation Notes

- **DILG branding** is applied across Login and main app (primary `#D4140F`).
- Status colors (Completed, On-going, Pending) remain semantic (green, amber, red) for document states.
- Keep design tokens in `index.css` and `tailwind.config.js` consistent across the React app.
- Keep `UI-REFERENCE.md` and this file in sync when changing layout or copy.

---

*Design system derived from `index.css`, `tailwind.config.js`, `Login.jsx`, `Navigation.jsx`, and page components.*

# TechHaven: Design System & UI/UX Architecture Specification (DESIGN.md)

**Version:** 3.1.0-production  
**Target Audience:** High-End PC Hardware, Electronics Enthusiasts, System Integrators & B2B Commercial Buyers in Egypt & MENA.  
**Design Philosophy:** Precision engineering, dense technical clarity, restrained ergonomics, zero generic AI aesthetic slop.

---

## 1. Core Design Principles

1. **Hardware-First Density & Technical Honesty**
   - Users come to TechHaven to evaluate socket compatibility, VRM phases, boost clocks, TDP, memory timings, and real availability.
   - Prioritize clear, tabular, and scannable technical specs over decorative fluff and oversized lifestyle cards.
   - Real inventory status (e.g., "3 in stock at Maadi warehouse") and transparent pricing in EGP with VAT clarity.

2. **Restrained, Professional Precision (Anti-Slop Standard)**
   - **No fake glassmorphism:** Solid, opaque dark surfaces with sharp 1px borders instead of heavy backdrop-blur overlays.
   - **No oversized rounded pill madness:** Consistent 6px–10px radii for cards and controls. No 24px+ bubble corners.
   - **No decorative floating gradients or artificial ambient glows:** Light should emit from functional focus states or active accents only.
   - **No emoji substitutes for icons:** Strict Lucide SVG icon set with consistent 16–20px sizing, 1.75px stroke width, and semantic color pairing.

3. **Bilingual Dual-Engine Ergonomics (Arabic RTL & English LTR)**
   - True mirror layout for Arabic (`[dir="rtl"]`) using Cairo font for Arabic readability and Inter for English technical terminology.
   - Symmetrical spacing and proper bidirectional icon flipping (e.g., directional chevrons and breadcrumb arrows flip; brand marks and technical units stay intact).

4. **Operational & Enterprise Ergonomics in Admin/ERP**
   - High data-density tables with sticky headers, monospaced numbers for SKUs, financial totals, and stock counts.
   - Clean status badges with explicit text and high-contrast borders.
   - Rapid keyboard-accessible filters and search across inventory and orders.

---

## 2. Design Tokens & Variables

### Color Palette

| Token | Value | Semantic Role |
|---|---|---|
| `--bg-app` | `#0A0B0E` | Deepest graphite page background |
| `--surface-primary` | `#11141C` | Primary layout shell & page container |
| `--surface-card` | `#161924` | Default content card & container surface |
| `--surface-card-hover` | `#1C202E` | Interactive hover state for cards |
| `--surface-elevated` | `#222738` | Drawers, modals, dropdown menus |
| `--surface-input` | `#0E1017` | Form inputs, search fields, textareas |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Standard dividers, card borders |
| `--border-medium` | `rgba(255, 255, 255, 0.16)` | Focused card boundaries, input borders |
| `--border-focus` | `#FF5E00` | Keyboard focus ring & active field ring |
| `--brand-orange` | `#FF5E00` | Primary action accent (Hardware Orange) |
| `--brand-orange-hover` | `#E05200` | Button hover & active interaction |
| `--brand-orange-subtle` | `rgba(255, 94, 0, 0.12)` | Badge backgrounds, active tab pills |
| `--accent-cyan` | `#00D2FF` | Technical highlights, specs, PC builder |
| `--color-success` | `#10B981` | In-stock status, payment confirmed |
| `--color-warning` | `#F59E0B` | Low stock alert (<5 units), pending review |
| `--color-error` | `#EF4444` | Out of stock, payment declined, form error |
| `--text-primary` | `#FFFFFF` | Headings, titles, active labels |
| `--text-secondary` | `#CBD5E1` | Body copy, descriptions, table rows |
| `--text-muted` | `#94A3B8` | Metadata, helper text, timestamps, SKUs |

### Typography Scale

- **Font Stacks:**
  - Primary (LTR): `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  - Primary (RTL): `'Cairo', 'Inter', -apple-system, sans-serif`
  - Monospace (SKUs, IDs, Currency, Code): `'JetBrains Mono', 'Fira Code', 'Courier New', monospace`

- **Scale:**
  - `Display / H1`: `2.25rem (36px)` / `line-height: 1.2` / `font-weight: 800`
  - `Section / H2`: `1.75rem (28px)` / `line-height: 1.3` / `font-weight: 700`
  - `Card / H3`: `1.25rem (20px)` / `line-height: 1.4` / `font-weight: 600`
  - `Subhead / H4`: `1.05rem (17px)` / `line-height: 1.4` / `font-weight: 600`
  - `Body Regular`: `0.9375rem (15px)` / `line-height: 1.6` / `font-weight: 400`
  - `Body Compact / Meta`: `0.8125rem (13px)` / `line-height: 1.5` / `font-weight: 500`
  - `Caption / Micro`: `0.75rem (12px)` / `line-height: 1.4` / `font-weight: 600`

### Spacing & Grid System

- Base scale: `4px` grid (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `48px`, `64px`)
- Container max-width: `1360px` with responsive gutters (`16px` mobile, `24px` tablet, `32px` desktop)

### Borders & Radius

- `Button & Input Radius`: `6px` or `8px`
- `Card Radius`: `8px` to `10px`
- `Modal & Drawer Radius`: `12px`
- `Border Width`: Exactly `1px solid` throughout

---

## 3. Component Architecture & Rules

### 1. Product Cards
- Ratio-preserving image container with dark neutral background (`#11141C`).
- Immediate visibility of brand name, model, stock availability badge, and specs summary (e.g. 16GB GDDR6X, 2610 MHz).
- Price display with primary EGP formatting, clear discount tags, and instantaneous "Add to Cart" / "Wishlist" toggles.
- No noisy bouncing hover transforms: subtle `translateY(-2px)` and 1px border shift to `--border-medium`.

### 2. Navigation Header (Navbar)
- Sticky, high-utility top bar with prominent search field, category megamenu trigger, PC Builder shortcut, B2B portal link, and live Cart & Wishlist counters.
- Embedded currency and language switchers (AR/EN) with instant RTL mirroring.

### 3. PC Builder Configurator
- Clean step-by-step component selection slots with power wattage calculation, socket compatibility checks, and running total price.
- Quick-filter drawer for selecting components without losing build context.

### 4. Admin & ERP Layout
- Fixed 260px sidebar with clear section grouping (Operations, Catalog, Purchasing, ERP Financials, Analytics, System).
- Dense data tables with horizontal scroll containers, zebra striping on demand, and explicit empty/loading skeleton states.
- Action buttons with clear semantic weight (Primary Blue/Orange, Secondary Neutral, Destructive Red).

---

## 4. Accessibility & Responsive Verification

- WCAG 2.1 AA compliant contrast across all text elements (minimum 4.5:1 for body copy).
- Explicit `:focus-visible` styling (`outline: 2px solid var(--brand-orange); outline-offset: 2px;`).
- Responsive breakpoint breakdown:
  - Mobile: `< 640px` (single column cards, bottom navigation / hamburger drawer, sticky mobile cart bar)
  - Tablet: `640px - 1024px` (2-column grids, collapsible filter drawer)
  - Desktop: `> 1024px` (3 to 4-column product grids, persistent filter sidebar, wide admin tables)

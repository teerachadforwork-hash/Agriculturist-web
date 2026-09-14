---
name: AgriSmart Thailand Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f493f'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6f7a6e'
  outline-variant: '#becabc'
  surface-tint: '#006d30'
  primary: '#00652c'
  on-primary: '#ffffff'
  primary-container: '#15803d'
  on-primary-container: '#d3ffd5'
  inverse-primary: '#79db8d'
  secondary: '#9b4500'
  on-secondary: '#ffffff'
  secondary-container: '#fd8a42'
  on-secondary-container: '#682c00'
  tertiary: '#005c8e'
  on-tertiary: '#ffffff'
  tertiary-container: '#2075ae'
  on-tertiary-container: '#eef5ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#95f8a7'
  primary-fixed-dim: '#79db8d'
  on-primary-fixed: '#00210a'
  on-primary-fixed-variant: '#005323'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb68e'
  on-secondary-fixed: '#331200'
  on-secondary-fixed-variant: '#763300'
  tertiary-fixed: '#cde5ff'
  tertiary-fixed-dim: '#94ccff'
  on-tertiary-fixed: '#001d32'
  on-tertiary-fixed-variant: '#004b74'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-numeric:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
  label-badge:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  caption:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system is engineered for Thai agricultural producers operating in high-glare, outdoor, and variable-connectivity conditions. The aesthetic fuses **Utilitarian Clarity** with **Modern Tactile Agricultural Tech**. It rejects delicate, low-contrast desktop conventions in favor of high-legibility, hyper-structured layouts optimized for field execution, one-handed thumb navigation, and direct sunlight visibility.

### Key Tenets
- **Direct Sunlight Legibility:** High contrast ratios (exceeding WCAG AAA for key metrics), dense structural borders, and glare-resistant surfaces.
- **Physical Reliability:** Chunky, deliberate touch targets (minimum 48px, standard 56px for primary actions) accommodating damp or gloved hands.
- **Financial Lucidity:** Numeric pricing, moisture deductions, and net yield metrics are treated as primary hero objects with dedicated tabular layouts and color-coded status states.
- **Resilient Connectivity:** First-class visual treatment for offline caching, queue synchronization, and GIS location fidelity.

## Colors

The palette balances lush agricultural vitality with functional safety and regulatory contrast. 

- **Primary (`#15803d` / Emerald Green):** Denotes verified transactions, positive margins, confirmed mill bookings, and primary execution paths.
- **Secondary (`#b45309` / Paddy Gold & Amber):** Represents harvested grain, commodity crops (rice, cassava starch, sugarcane Brix), and moderate caution thresholds.
- **Tertiary (`#0369a1` / Logistics Azure):** Dedicated to GIS route tracking, mill radius mapping, vehicle matching, and haulage logistics.
- **Neutral Surface & Ink (`#0f172a` deep slate text, `#f8fafc` primary field canvas, `#f1f5f9` card surface):** Ensures absolute separation without harsh pure-black eye strain, retaining maximum dynamic range under direct sunlight.

### Semantic Alert & Forecasting Tiers
- **Safe (Green):** Background `#dcfce7`, Border `#86efac`, Text `#14532d`
- **Watch (Amber):** Background `#fef3c7`, Border `#fcd34d`, Text `#78350f`
- **Alert (Crimson):** Background `#fee2e2`, Border `#fca5a5`, Text `#7f1d1d`
- **Offline / Draft (Slate):** Background `#f1f5f9`, Border `#cbd5e1`, Text `#334155`

## Typography

The type system pairs **Be Vietnam Pro** with **Space Grotesk**. Be Vietnam Pro provides wide apertures, tall x-height, and clean diacritic balance suitable for complex Thai script rendering (matching the tone of Prompt and Sarabun). Space Grotesk acts as the numeric and operational engine for currency symbols (THB/฿), metric tonnage (ตัน), moisture percentages (%), and AI risk thresholds.

- Use `label-numeric` for all live calculator inputs, deductions, and GIS kilometer counters.
- All body copy defaults to minimum 15px with weight 500 in outdoor operational views to prevent glyph washout.

## Layout & Spacing

A mobile-first fluid single-column layout strictly enforcing 16px screen padding (`margin: 1rem`) on handheld devices. On viewports broader than 768px, content snaps to a centered 640px phone container or a responsive two-column cockpit for dispatch agents.

### Operational Spacing Rules
- Form fields and numeric adjustment steppers must have at least `space-md` (12px) separation to avoid mis-taps.
- Floating bottom-action docks have a fixed height of 72px with `space-lg` inset to ensure complete clearance of thumb navigation zones.
- GIS map canvas views collapse header margins to 0px, superimposing touch chips directly on map overlays.

## Elevation & Depth

This design system avoids blurry, low-contrast shadows that dissipate in tropical sunlight. Depth is instead defined via **Crisp Surface Boundaries** and **High-Contrast Contours**.

- **Surface Floor (`#f8fafc`):** Base canvas layer.
- **Level 1 Containers (`#ffffff`):** Outlined with `1.5px solid #e2e8f0` and an ambient, compact drop: `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)`.
- **Level 2 Interactive & Floating Docks:** Outlined with `2px solid #cbd5e1` plus an anchor shadow: `box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12)`.
- **Active Selection & Focus State:** `box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.25)`.

## Shapes

The geometric architecture implements standard `8px` (`0.5rem`) corner rounding on base cards and form components, rising to `16px` (`1rem`) on outer feature cards and bottom sheets. 

- Large inputs and numeric touch pads use `8px` to maximize screen real estate and visual stability.
- Status badges and connectivity pills utilize full pill shapes (`rounded-full`) to contrast against rectangular data cards.

## Components

### 1. Buttons & Steppers
- **Primary CTA:** Minimum height 52px (standard 56px). Solid `#15803d`, text `#ffffff`, bold 16px. Active press state shifts to `#166534`.
- **Numeric Stepper:** Segmented card with dual 48x48px decrement (`-`) and increment (`+`) physical target zones bounding a high-contrast editable numeric display.

### 2. Crop Calculation & Deduction Cards
- Structured financial tables displaying Gross Weight, Moisture Deduction (%), Impurity Index, Transport Cost/km, and Final Net Payout.
- Final Net Payout displayed in `display-lg-mobile` green text over a soft `#f0fdf4` inner canvas with a `#bbf7d0` border.

### 3. AI Price Forecast Badges
- Inline chips with dual visual signals (icon + bold text):
  - **Safe (Upward / Stable):** `[▲ SAFE +฿250/t]` in `#14532d` on `#dcfce7`.
  - **Watch (Volatile):** `[■ WATCH ±฿100/t]` in `#78350f` on `#fef3c7`.
  - **Alert (Downward Drop):** `[▼ DANGER -฿400/t]` in `#7f1d1d` on `#fee2e2`.

### 4. Connectivity & Sync Status Bar
- Fixed persistent bar directly below the application header.
- **Online:** Hidden or 24px subtle pulse indicator `#15803d`.
- **Offline Draft Mode:** Solid `#334155` background, `#f8fafc` bold text, displaying local pending queue count: `[● Offline - 3 บันทึกรอส่ง]`.

### 5. Form Fields & Touch Inputs
- Minimum container height: 50px.
- Labels remain pinned above the input (no floating placeholders) in bold 14px `#334155` to prevent ambiguity under bright sky glare.
- Error states show a thick 2px `#dc2626` border and an exclamation icon indicator.

### 6. GIS Mill & Logistics Matching Cards
- Horizontal list cards featuring mill name, operational intake hours, live wait-time indicator, distance in kilometers (`Tertiary #0369a1`), and immediate call/navigate trigger buttons.
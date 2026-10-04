---
name: Mekong Apparel Attendance
description: A mineral-light shared gate control desk with a persistent attendance ledger.
colors:
  background: "#f3f5f2"
  foreground: "#192c25"
  card: "oklch(1 0 0)"
  primary: "#246348"
  primary-foreground: "#ffffff"
  muted-foreground: "#5b685f"
  secondary: "oklch(0.967 0.001 286.375)"
  secondary-foreground: "oklch(0.21 0.006 285.885)"
  border: "oklch(0.922 0 0)"
  clock-field: "#163e30"
  clock-ink: "#f3fff7"
  clock-support: "#c2d9cd"
typography:
  display:
    fontFamily: "Geist Mono, monospace"
    fontSize: "clamp(38px, 4vw, 56px)"
    fontWeight: 450
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(28px, 2.6vw, 36px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "15px"
    lineHeight: 1.6
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "12px"
  timestamp:
    fontFamily: "Geist Mono, monospace"
    fontSize: "12px"
    fontWeight: 450
rounded:
  control: "10px"
  panel: "16px"
  pill: "26px"
spacing:
  compact: "8px"
  control-gap: "12px"
  inset-small: "16px"
  mobile-gutter: "20px"
  inset-medium: "24px"
  panel-inset: "28px"
  tablet-gutter: "32px"
  stack-gap: "36px"
  desktop-gutter: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    height: "56px"
  button-outline:
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "56px"
  button-refresh:
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    height: "32px"
  worker-select:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.control}"
    height: "52px"
  badge-on-site:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.pill}"
    height: "20px"
  badge-complete:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.pill}"
    height: "20px"
  ledger-panel:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.panel}"
  clock-face:
    backgroundColor: "{colors.clock-field}"
    textColor: "{colors.clock-ink}"
    rounded: "{rounded.panel}"
    padding: "26px"
---

# Design System: Mekong Apparel Attendance

## Overview

**Creative North Star: "Gate control desk"**

A readable shared terminal pairs an arrival/departure control area with a persistent attendance ledger. Light mineral surfaces, a deep forest-green clock field, workhorse sans typography, and tabular timestamps create a calm, practical visual world. Color highlights time, enabled primary actions, and on-site state; the ledger remains quiet and easy to scan.

This document captures the implemented web local attendance terminal, not a proposed redesign. Authority is the hidden design contract `fd833913` in `app/layout.tsx`, `app/globals.css`, `components/attendance-terminal.tsx`, the shadcn components backed by Base UI, and the supplied desktop and mobile screenshots. Geist and Geist Mono are loaded through Next.js font variables. The native worker select remains a native browser control within the shadcn system.

**Key Characteristics:**
- Mineral-light canvas with a forest-green clock anchor.
- Direct task controls beside a bordered, white ledger.
- Geist for language; Geist Mono for clock and record times.
- Restrained borders, rounded panels, and compact status pills.
- Desktop columns become a vertical terminal and responsive ledger on mobile.

**Finish review: PASS.** The supplied desktop (1440px wide) and mobile (390px wide) captures demonstrate the intended visual world and responsive composition. Nonblocking follow-ups: supporting type is small (mostly 11–12px, with 10px mobile summary labels); mobile header accessibility needs verification, including the hidden terminal descriptor and the Local demo badge absent from the supplied mobile capture; retry feedback exposes technical “request ID” language. The mobile ledger also hides its table header and uses generated labels, so assistive-technology header associations need verification. This is a finish documentation review, not a completed accessibility audit; keyboard, screen-reader, zoom, and contrast coverage are not established by these screenshots.

## Colors

The palette is pale mineral neutrals with a single forest-green action family. Frontmatter preserves the source's actual CSS color formats; it does not normalize OKLCH tokens into competing hex definitions.

The companion `.impeccable/design.json` extends these tokens with preview snippets, responsive breakpoints, motion, and narrative. Its synthesized eight-step OKLCH ramps are panel visualization aids, not implemented color scales or replacements for the normative frontmatter colors. Snippets represent existing components without requiring React or Tailwind at render time; clock colors remain literal because the source defines them locally rather than as root custom properties.

### Primary
- **Action Forest** (`primary`): enabled clock-in buttons, on-site badges, brand icon, connected indicator, and focus-ring hue.
- **Deep Clock Forest** (`clock-field`): the substantial dark clock surface.
- **Clock Mist** (`clock-ink`) and **Soft Sage Ink** (`clock-support`): time and supporting information on the clock field.
- **White Action Ink** (`primary-foreground`): text on solid green controls and badges.

### Neutral
- **Mineral Paper** (`background`): the entire terminal canvas.
- **Forest Ink** (`foreground`): page headings and normal terminal text.
- **White Ledger** (`card`): ledger and worker select surfaces.
- **Muted Sage Gray** (`muted-foreground`): helper text, dates, identifiers, and footer information.
- **Quiet Stone** (`secondary`) and its ink: completed/off-site status, subordinate to active green status.
- **Hairline Gray** (`border`): panel outlines, table rules, and structural dividers; the input token uses the same source value.

**The State Green Rule.** Preserve green as the clock, action, and on-site state anchor; completed records remain neutral.

Destructive feedback uses the existing shadcn destructive token, not an additional brand accent. Chart, sidebar, and dark-theme defaults exist in the stylesheet but are not part of this captured light terminal's visual vocabulary.

## Typography

**Body and headline font:** Geist, sans-serif fallback. **Clock and timestamp font:** Geist Mono, monospace fallback. The pairing is workmanlike and compact: expressive scale belongs to the time display and headline, while small operational metadata supports scanning.

- **Display:** live clock; frontmatter describes desktop. At widths up to 850px it becomes 56px, then at widths up to 480px uses `clamp(38px, 12vw, 52px)`. Numerals are tabular.
- **Headline:** terminal introduction; 34px in the stacked intermediate layout and 30px on small mobile.
- **Title:** ledger heading; 19px on small mobile.
- **Body:** introductory instruction, limited to 38ch; 14px on small mobile. Action text is 15px and medium weight.
- **Label/support:** clock annotations, helper text, identifiers, and notes mostly range from 11–13px. The field label retains the shadcn field styling.
- **Timestamp:** compact mono time above a smaller sans date; missing clock-out is an em dash.
- **Summary:** sans tabular counts (28px, weight 500), reducing to 24px on small mobile.
- **Brand:** 24px, weight 650, tight tracking; “Apparel” is regular weight. Small mobile uses 20px.

**The Time Is Data Rule.** Keep clock and saved times monospaced and tabular; keep instructions and worker identity in Geist.

Small supporting typography is an observed property and a nonblocking review note, not a minimum readability standard for future surfaces.

## Layout

The shell is centered with a maximum width of 1440px and desktop horizontal padding of 48px. The header has a 104px minimum height and a bottom rule. The workspace begins 48px below it, with a control column ranging from 320–420px and a flexible ledger column, separated by 48px. The supplied desktop capture shows the left control desk and the ledger aligned at the top.

- **Up to 1100px:** gutters become 32px; the control column ranges from 300–360px and the column gap becomes 28px. Ledger heading and summary insets tighten.
- **Up to 850px:** workspace becomes one column with a 36px gap and 32px top padding. The gate area is centered and capped at 600px; ledger follows the controls.
- **Up to 480px:** shell gutters become 20px; header minimum height becomes 84px. Ledger insets tighten to 16px. Actions remain two equal columns with a 12px gap.

The desktop ledger has four columns: worker/line, clock in, clock out, status. Its table minimum width is 480px and its wrapper supports horizontal overflow at intermediate widths. Small mobile removes that minimum and displays each record as a two-column grid: worker identity and status on the first row, then clock-in and clock-out with explicit generated labels. Record separators and stacked time/date pairs retain scanability without a desktop-width table.

The summary strip keeps three equal columns, with dividers between metrics. Footer content wraps rather than forcing a fixed-width line. No fixed positioning or floating navigation is used.

## Elevation & Depth

The terminal is flat at rest: no panel shadows are used. Depth comes from the dark clock field, the white ledger against the mineral canvas, thin borders, and internal separators. The ledger clips content to its rounded outline. Focus rings are interaction feedback rather than ambient elevation.

Buttons and select use a 3px ring in the primary hue at half opacity with a matching focused border. The home link has a 3px primary outline offset by 5px. Buttons use standard Tailwind state transitions and a one-pixel pressed translation; rows transition to a faint muted hover background. Reduced-motion CSS shortens animation and transition durations to 0.01ms.

## Shapes

Clock and ledger are gently curved panels; select and large clock actions use tighter control corners. Small refresh controls and badges retain the rounded shadcn pill form. Borders are thin and structural. Tiny circular dots accompany textual clock/connection information; they do not replace status words.

The base radius is 0.625rem; the shadcn pill radius is the derived 4xl value. The source explicitly overrides large terminal controls and panels with the frontmatter's control and panel radii.

## Components

### Buttons

Direct and task-oriented. Clock in is solid green; Clock out is an outlined, lightly tinted neutral control. Both are 56px high, full-width within their grid tracks, with directional icons. Refresh is a smaller outlined pill with an icon and visible text. Base UI provides the button primitive.

Primary hover uses the primary color at 80% opacity; outline hover increases the input tint from 30% to 50%. Focus uses the ring described above. Disabled buttons halve opacity and suppress pointer interaction. During saves, the action icon becomes a spinner and the label becomes “Saving…”. Availability and on-site state determine which action is enabled; the screenshots show an on-site worker with clock-in disabled.

### Worker selection and preview

A labeled, full-width native select on white, 52px high with a 16px left inset and a chevron. The default option requests a demo worker; helper copy declares invented data. Focus uses the shared ring; disabled state dims the wrapper. Below it, a name/identifier/line preview pairs with a status badge. Without a selection, it supplies a readiness message instead.

### Status pills

Compact 20px-high capsules with 12px medium text and horizontal 8px padding. On site is green with white text; Complete and Off site use the quiet secondary neutral. Local demo uses the outlined badge variant. These are informational spans in the terminal, not interactive filters.

### Clock face

The signature dark forest panel places location and UTC offset above large time, then a full date and a divided supporting note. Clock face padding is 26px on desktop, 28px in the stacked intermediate layout, and 22px on small mobile. Its live display is the laptop clock; supporting copy distinguishes it from database-stamped records. The internal divider and dot use the source's localized green shades, not additional global accents.

### Attendance ledger

A bordered white panel with a heading/Refresh pair, three summary counts, responsive records, and a divided connection footer. The heading has a 28px desktop inset; the summary uses horizontal rules, not nested cards. Worker names, identifiers, line names, times, dates, and status pills have distinct hierarchy. Table cell vertical padding is 18px on desktop; small mobile uses 10px by 12px and a 10px row inset.

### Feedback and empty states

Existing shadcn alert, empty, and spinner components carry loading, connection failure, save confirmation, uncertain-save, and empty-ledger states. Success identifies worker and saved time. Errors retain explicit uncertainty, and stale records receive a warning. Refresh checks the database; confirmation is tied to a saved response. These states are evidenced in source, not all exercised in the supplied captures. Retry copy currently mentions request-ID reuse; that is a nonblocking copy follow-up.

### Header and footer

The header uses a factory icon and two-weight wordmark as a home link with an explicit accessible name. Desktop includes a terminal descriptor and Local demo badge; CSS hides the descriptor on small mobile. The supplied mobile screenshot shows only the brand, so badge visibility is not visually confirmed. The footer is two compact lines of capstone/demo context with a top rule; it wraps naturally on mobile.

## Do's and Don'ts

### Do:
- **Do** preserve mineral-light surfaces and the forest-green clock/action hierarchy.
- **Do** use Geist for language and Geist Mono with tabular numerals for times.
- **Do** keep status words alongside color and connection dots.
- **Do** retain the mobile ledger's worker/status row and labeled time pairs.
- **Do** distinguish the laptop clock from saved database timestamps.

### Don't:
- **Don't** introduce panel shadows into this flat, border-led terminal.
- **Don't** render completed records with the active on-site green treatment.
- **Don't** force the desktop table's minimum width onto small mobile records.
- **Don't** treat small supporting type or hidden mobile table headers as proof of accessibility compliance.
- **Don't** describe a click alone as a saved attendance record.

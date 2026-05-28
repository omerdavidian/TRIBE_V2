---
name: design-expert
title: Design Expert Skill
description:
  Create unique, production-grade frontend designs for TRIBE, pushing creative
  boundaries within brand guidelines and drawing inspiration from premium design
  platforms (Google Stitch, Webflow, Framer).
category: frontend
requires:
  - nodejs
  - typescript
  - next.js
  - tailwind-css
stack:
  - framework: Next.js 15+ (App Router)
  - styling: Tailwind CSS with TRIBE design tokens
  - languages: TypeScript, JSX/TSX
  - fonts: Inter (sans), Playfair Display (display)
  - darkMode: class-based switching
---

## Overview

This skill creates best-in-class, production-grade interfaces for TRIBE,a
postpartum care marketplace connecting mothers with essential services. It
specializes in generating innovative UI components that elevate TRIBE's brand.
The skill balances functional marketplace constraints with highly creative,
premium execution.

## TRIBE Design System

### Color Palette & Accessibility

- **Teal (Primary):** `#2F6A63` | Buttons, navigation, primary actions.
- **Coral (Accent):** `#A63D55` | Highlights, targeted CTAs, emotional warmth.
- **Cream (Background):** `#F6F3ED` | Soft, inviting neutral background.
- **Sand (Supporting):** `#B5966E` | Secondary neutral for depth, borders, or
  subtle textures.
- **Dark Mode:** Teal 900 (`#122D29`) backgrounds with cream text.
- _Note: Target strict WCAG 2.1 AA compliance across all text and element
  contrast combinations._

### Typography & Motion

- **Display Font:** Playfair Display (serif), Headlines, editorial sections,
  branding.
- **Body Font:** Inter (sans-serif), UI components, forms, body text.
- **Animations:** Purposeful, fluid motion. Use smooth fade-ins, gentle
  slide-ups for content reveals, and snappy micro-interactions on interactive
  elements.

## When to Use This Skill

Invoke this skill when the user requests to:

- **Reimagine & overhaul** existing pages with fresh, unique layouts.
- Build **next-generation** Next.js pages, multi-step booking flows, or
  onboarding experiences.
- Design premium, intuitive dashboards for healthcare providers and mothers.
- Style authentication flows or complex forms with **exceptional UX patterns**.
- **Elevate** standard Tailwind components to premium, custom-feeling standards.

## Key Capabilities

- 🎨 **Structured Creativity:** Reimagines layouts, white-space, and
  micro-interactions while rigidly respecting core brand tokens.
- ⚡ **Modern Next.js Expert:** Clean utilization of App router patterns, server
  components, and native optimization (`Image`, `Link`).
- 📱 **Fluid Responsiveness:** Flawless, mobile-first design scaling elegantly
  from 375px up to 2560px.
- 🌓 **Seamless Theming:** Flawless class-based dark mode transitions mapping to
  the specified dark palette.

## File Structure & Integration Rules

**For TRIBE-V2:**

```text
apps/web/
├── src/
│   ├── app/           # Next.js 15 App Router pages
│   ├── components/    # Reusable React components (Target Directory)
│   ├── lib/           # Utilities (api.ts, auth.ts)
│   └── globals.css    # Global styles & Tailwind imports
├── tailwind.config.ts # Design tokens configuration
└── tsconfig.json      # TypeScript config
Create components in: apps/web/src/components/

Update styles in: Tailwind classes + apps/web/src/globals.css (only for complex custom animations/utilities).

Backend Integration Context
When designing UIs, assume and design for the following backend realities:

API Contract: Fastify API (apps/api) routes under the /v1/ prefix (auth, catalog, registry, waitlist).

Validation UX: Zod schema validation. Always design elegant inline error states and success feedback for forms.

Data Models: Drizzle ORM data shapes. Ensure UI components can handle loading states, empty states, and deeply nested relational data gracefully.

Component Examples to Follow
When generating layouts, use these as mental models for the domain:

Mother dashboard (showing booked services, ratings).

Provider profile cards in the marketplace.

Service booking flow (multi-step wizard).

Provider search & filter interface (with faceted search).

Testimonials/ratings display.

Best Practices
✅ Push boundaries layout-wise while maintaining the calm, professional healthcare aesthetic.

✅ Combine native Tailwind utilities with targeted arbitrary values or globals.css utilities for truly custom effects.

✅ Design for 44px+ touch targets universally to accommodate tired, busy parents.

✅ Use CSS Grid and Flexbox dynamically; ensure empty/loading states are as beautiful as populated states.

✅ Build reusable, composable component patterns rather than massive single-file monolithic pages.
```

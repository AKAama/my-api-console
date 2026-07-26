# Experience Résumé Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a localized “View Full Résumé” link after Experience that opens the existing `/resume.pdf` in a new tab.

**Architecture:** Extend the bilingual portfolio content with one résumé label and expose the fixed document-link attributes alongside the other public link data. Render a single accessible anchor after the Experience cards and style it with the existing teal accent system.

**Tech Stack:** React, TypeScript, CSS Modules, Vitest, Umi

## Global Constraints

- English label: `View Full Résumé`.
- Chinese label: `查看完整简历`.
- Destination: `/resume.pdf`.
- Open in a new tab with `rel="noreferrer"`.
- Do not change the PDF, Experience entries, navigation, or other sections.
- Do not commit or push.

---

### Task 1: Localized résumé link

**Files:**
- Modify: `src/content/portfolio.test.ts`
- Modify: `src/content/portfolio.ts`
- Modify: `src/components/Portfolio/Portfolio.tsx`
- Modify: `src/components/Portfolio/Portfolio.module.css`

**Interfaces:**
- Produces: `resumeLink` containing `href`, `target`, and `rel`.
- Produces: `PortfolioContent.experience.resumeCta`.
- Consumes: existing `copy`, language switching, and Experience rendering.

- [ ] **Step 1: Write the failing content test**

Add assertions that the English and Chinese content expose the exact localized labels and that `resumeLink` exposes `/resume.pdf`, `_blank`, and `noreferrer`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/content/portfolio.test.ts`

Expected: failure because `resumeLink` and `experience.resumeCta` do not exist.

- [ ] **Step 3: Add the minimum content and rendering**

Add the two localized labels and fixed link attributes. Render the anchor immediately after the Experience cards with an arrow marked `aria-hidden="true"`.

- [ ] **Step 4: Add focused styling**

Use the existing teal accent, a subtle animated underline/arrow treatment, and a visible `:focus-visible` outline. Keep the link aligned with the Experience card content on desktop and mobile.

- [ ] **Step 5: Run verification**

Run the focused test, then the full test suite and `npm run build`. Confirm `public/resume.pdf` exists and inspect the final diff.

- [ ] **Step 6: Leave the work uncommitted**

Do not create a commit or push.

# Project Presentation Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Experience, remove Education, replace project cards with screenshot-led editorial rows, and use recognizable social brand icons.

**Architecture:** Capture each live project homepage once and ship optimized local screenshots from `public/projects`. Extend the existing typed project metadata with image paths and alt text, render each project as a semantic media row, and use React Icons for social links without changing the page's bilingual content flow.

**Tech Stack:** Umi, React, TypeScript, Motion for React, React Icons, CSS Modules, Vitest, Testing Library

## Global Constraints

- Do not commit or push.
- Keep Experience and remove Education.
- Use real locally stored screenshots from all four live project homepages.
- Project rows have no visible card shell, project number, or decorative color block.
- Use an approximately 42/58 image-to-copy split on desktop and stack image above copy on mobile.
- Replace social letter abbreviations with GitHub, Weibo, Instagram, LinkedIn, and email icons.
- Preserve English-default bilingual behavior and reduced-motion support.

---

### Task 1: Project screenshots and metadata

**Files:**
- Create: `public/projects/calendar.jpg`
- Create: `public/projects/evenly.jpg`
- Create: `public/projects/calm.jpg`
- Create: `public/projects/lyrics.jpg`
- Modify: `src/content/portfolio.ts`
- Test: `src/content/portfolio.test.ts`

**Interfaces:**
- Extends `ProjectLink` with `image: string` and `imageAlt: Record<Language, string>`.
- Produces four local `/projects/*.jpg` paths consumed by `Portfolio`.

- [ ] Add a failing content test asserting four unique local image paths and bilingual alt text.
- [ ] Run `npm test -- src/content/portfolio.test.ts` and confirm failure because image metadata is absent.
- [ ] Capture the visible landing view of each live project at a consistent desktop viewport and store the screenshots in `public/projects`.
- [ ] Add the four image paths and accurate bilingual alt text to `projectLinks`.
- [ ] Re-run the content test and confirm it passes.

### Task 2: Editorial project rows and social icons

**Files:**
- Modify: `src/components/Portfolio/Portfolio.tsx`
- Modify: `src/components/Portfolio/Portfolio.module.css`
- Modify: `src/components/Portfolio/Portfolio.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes `ProjectLink.image` and `ProjectLink.imageAlt`.
- Produces four `article` elements containing a local screenshot and bilingual copy.

- [ ] Add failing page assertions that Education is absent, four project images use local paths, project numbers are absent, and social links contain SVG icons.
- [ ] Run `npm test -- src/components/Portfolio/Portfolio.test.tsx` and confirm the new assertions fail.
- [ ] Install `react-icons`.
- [ ] Remove the Education markup and render the four social links with `FaGithub`, `FaWeibo`, `FaInstagram`, `FaLinkedinIn`, and `HiOutlineMail`.
- [ ] Replace the project grid/card markup with one linked media row per project: image wrapper first, copy second, no project number.
- [ ] Replace card styles with borderless editorial rows, 42/58 desktop columns, subtle image scaling, and a stacked mobile layout.
- [ ] Re-run the page test and the full test suite.

### Task 3: Regression verification

**Files:**
- Modify only if a verification failure identifies a real defect.

**Interfaces:**
- Produces a buildable portfolio with the revised presentation and no API calls.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Scan `src` for the résumé phone number, profile image URL, old console/API strings, and the removed Education heading.
- [ ] Inspect `git status` and leave all changes uncommitted.

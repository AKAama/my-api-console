# Personal Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AI management console with a bilingual, motion-enhanced personal portfolio for Ma Yehui.

**Architecture:** Keep the existing Umi and React application shell, but replace the monolithic console page with a small portfolio component tree. Store all bilingual copy and public links in one typed content module, keep language persistence and active-section tracking in focused hooks, and style the page with one responsive CSS module.

**Tech Stack:** Umi, React, TypeScript, Motion for React, CSS Modules, Vitest, Testing Library

## Global Constraints

- English is the default language; Chinese is the alternative.
- Publish `isyehui@gmail.com`, GitHub, Weibo, Instagram, and LinkedIn; never publish the résumé phone number or profile photo.
- Keep the existing backend directory untouched and make no frontend API requests.
- Keep motion restrained and honor `prefers-reduced-motion`.
- Retain the four verified independent projects and the Hexo blog.
- Do not fabricate project technologies, article lists, dates, or professional claims.
- Remove the Ant Design console, AI tools, model management, chat, generation features, and unused frontend dependencies.

---

### Task 1: Typed bilingual content and test foundation

**Files:**
- Create: `src/content/portfolio.ts`
- Create: `src/content/portfolio.test.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `Language = 'en' | 'zh'`
- Produces: `portfolioContent: Record<Language, PortfolioContent>`
- Produces: `socialLinks: SocialLink[]`
- Produces: `projectLinks: ProjectLink[]`
- Produces: `sectionIds = ['about', 'experience', 'projects', 'writing'] as const`

- [ ] **Step 1: Add the failing content contract test**

```ts
import { describe, expect, it } from 'vitest';
import { portfolioContent, projectLinks, socialLinks } from './portfolio';

describe('portfolio content', () => {
  it('ships complete English and Chinese content without private résumé data', () => {
    const serialized = JSON.stringify(portfolioContent);
    expect(portfolioContent.en.hero.role).toContain('Independent Developer');
    expect(portfolioContent.zh.hero.role).toContain('独立开发者');
    expect(projectLinks).toHaveLength(4);
    expect(socialLinks.map(({ label }) => label)).toEqual([
      'GitHub', 'Weibo', 'Instagram', 'LinkedIn', 'Email',
    ]);
    expect(serialized).not.toContain('151-9575-2030');
    expect(serialized).not.toContain('IMG_6320.jpeg');
  });
});
```

- [ ] **Step 2: Run the content test and verify RED**

Run: `npm test -- src/content/portfolio.test.ts`

Expected: FAIL because `src/content/portfolio.ts` does not exist.

- [ ] **Step 3: Add the test runner and typed content module**

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Add development dependencies for `vitest`, `jsdom`, `@testing-library/react`,
`@testing-library/jest-dom`, and `@testing-library/user-event`. Add `motion` as
a production dependency.

Define `PortfolioContent` with `meta`, `nav`, `hero`, `about`, `experience`,
`education`, `projects`, `writing`, and `footer` fields. Populate both languages
from the approved design and résumé facts. Keep URLs in language-neutral
`socialLinks` and `projectLinks` arrays.

- [ ] **Step 4: Run the content test and verify GREEN**

Run: `npm test -- src/content/portfolio.test.ts`

Expected: one test file passes with no private phone number or photo URL.

- [ ] **Step 5: Commit the content foundation**

```bash
git add package.json package-lock.json src/content src/test
git commit -m "feat: add bilingual portfolio content"
```

### Task 2: Language preference and active-section behavior

**Files:**
- Create: `src/hooks/useLanguage.ts`
- Create: `src/hooks/useLanguage.test.tsx`
- Create: `src/hooks/useActiveSection.ts`
- Create: `src/hooks/useActiveSection.test.tsx`

**Interfaces:**
- Consumes: `Language` and `sectionIds` from `src/content/portfolio.ts`
- Produces: `useLanguage(): { language: Language; setLanguage(language: Language): void }`
- Produces: `useActiveSection(ids: readonly string[]): string`

- [ ] **Step 1: Write failing hook tests**

```tsx
it('defaults to English and persists Chinese', async () => {
  const { result } = renderHook(() => useLanguage());
  expect(result.current.language).toBe('en');
  act(() => result.current.setLanguage('zh'));
  expect(localStorage.getItem('portfolio-language')).toBe('zh');
  expect(document.documentElement.lang).toBe('zh-CN');
});

it('selects the intersecting section', () => {
  const { result } = renderHook(() => useActiveSection(['about', 'projects']));
  intersectionCallback([{ isIntersecting: true, target: { id: 'projects' } }]);
  expect(result.current).toBe('projects');
});
```

- [ ] **Step 2: Run hook tests and verify RED**

Run: `npm test -- src/hooks`

Expected: FAIL because both hooks are missing.

- [ ] **Step 3: Implement the hooks**

`useLanguage` must validate the stored value, default to `en`, update
`document.documentElement.lang`, and write `portfolio-language` only when the
visitor changes language.

`useActiveSection` must use one `IntersectionObserver`, choose the visible entry
nearest the upper third of the viewport, default to the first supplied ID, and
disconnect during cleanup. If `IntersectionObserver` is unavailable, it must
retain the first ID without throwing.

- [ ] **Step 4: Run hook tests and verify GREEN**

Run: `npm test -- src/hooks`

Expected: language persistence and section-observer tests pass.

- [ ] **Step 5: Commit the behavior hooks**

```bash
git add src/hooks
git commit -m "feat: add portfolio navigation behavior"
```

### Task 3: Accessible portfolio page and responsive styling

**Files:**
- Create: `src/components/Portfolio/Portfolio.tsx`
- Create: `src/components/Portfolio/Portfolio.module.css`
- Create: `src/components/Portfolio/Portfolio.test.tsx`
- Replace: `src/pages/index.tsx`
- Modify: `config/config.ts`

**Interfaces:**
- Consumes: `portfolioContent`, `projectLinks`, `socialLinks`, and `sectionIds`
- Consumes: `useLanguage()` and `useActiveSection()`
- Produces: default `IndexPage` route component

- [ ] **Step 1: Write the failing page tests**

```tsx
it('renders the English portfolio without console controls', () => {
  render(<Portfolio />);
  expect(screen.getByRole('heading', { name: 'Ma Yehui' })).toBeVisible();
  expect(screen.getByText(/Independent Developer/)).toBeVisible();
  expect(screen.getAllByRole('article')).toHaveLength(6);
  expect(screen.queryByText('模型管理')).not.toBeInTheDocument();
  expect(screen.queryByText('图片生成')).not.toBeInTheDocument();
});

it('switches every visible section to Chinese', async () => {
  render(<Portfolio />);
  await userEvent.click(screen.getByRole('button', { name: '切换到中文' }));
  expect(screen.getByRole('navigation', { name: '主要导航' })).toBeVisible();
  expect(screen.getByRole('heading', { name: '关于我' })).toBeVisible();
  expect(screen.getByRole('heading', { name: '项目' })).toBeVisible();
});
```

- [ ] **Step 2: Run the page tests and verify RED**

Run: `npm test -- src/components/Portfolio/Portfolio.test.tsx`

Expected: FAIL because the Portfolio component is missing.

- [ ] **Step 3: Build the semantic component tree**

Implement:

```tsx
<div className={styles.page}>
  <a className={styles.skipLink} href="#main">Skip to content</a>
  <PointerGlow />
  <aside className={styles.sidebar}>
    <Hero />
    <SectionNav />
    <SocialLinks />
  </aside>
  <motion.main id="main" className={styles.content}>
    <AboutSection />
    <ExperienceSection />
    <ProjectsSection />
    <WritingSection />
    <Footer />
  </motion.main>
</div>
```

Use semantic `section`, `article`, `time`, `nav`, and heading elements. Every
external link uses `target="_blank"` and `rel="noreferrer"`. The language switch
has a localized accessible name. Update `document.title` and the description
meta tag when language changes.

Replace the Umi route page with a small render wrapper:

```tsx
import Portfolio from '@/components/Portfolio/Portfolio';
export default Portfolio;
```

Remove the obsolete `/api` development proxy from `config/config.ts`.

- [ ] **Step 4: Add responsive visual styling**

Implement navy, warm-white, blue-gray, and teal CSS custom properties; a
38/62 desktop grid; sticky sidebar; single-column mobile layout below 900px;
visible focus styles; project-specific restrained accents; a skip link; and
touch-safe spacing. Add `@media (prefers-reduced-motion: reduce)` and
`@media (hover: none)` rules that remove nonessential transforms and the
pointer glow.

- [ ] **Step 5: Run page and full tests**

Run: `npm test`

Expected: all content, hook, and page tests pass.

- [ ] **Step 6: Commit the portfolio UI**

```bash
git add src/components src/pages/index.tsx config/config.ts
git commit -m "feat: replace console with personal portfolio"
```

### Task 4: Remove console dependencies and verify the production result

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`
- Delete if tracked: generated `src/.umi` and `src/.umi-production` artifacts

**Interfaces:**
- Consumes: completed portfolio page from Task 3
- Produces: a production-buildable, documented static portfolio frontend

- [ ] **Step 1: Add a dependency-boundary test**

Extend `src/components/Portfolio/Portfolio.test.tsx`:

```ts
it('does not initiate API requests while rendering or changing language', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  render(<Portfolio />);
  await userEvent.click(screen.getByRole('button', { name: '切换到中文' }));
  expect(fetchSpy).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the boundary test and confirm current behavior**

Run: `npm test -- src/components/Portfolio/Portfolio.test.tsx`

Expected: PASS, proving the replacement page does not contact the old backend.

- [ ] **Step 3: Remove unused packages and update documentation**

Remove `antd`, `@ant-design/icons`, `axios`, `react-markdown`,
`remark-gfm`, and `react-syntax-highlighter`. Update the README to describe the
bilingual personal portfolio, its local development and test commands, and the
fact that the backend is not required by the homepage.

Do not delete files or changes owned by the user. Generated Umi files may only
be deleted if Git reports them as tracked build artifacts and their removal does
not overlap unrelated user edits; otherwise leave them untouched.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: all tests pass, lint reports no errors, the Umi production build exits
successfully, and Git reports no whitespace errors.

- [ ] **Step 5: Review the final diff against the design**

Confirm:

- English is the default and Chinese persists.
- All approved public links are present.
- Phone number and photo are absent.
- The four projects and blog are present.
- Experience and education match the supplied résumé.
- No console UI or API request remains.
- Motion respects reduced-motion preferences.

- [ ] **Step 6: Commit cleanup**

```bash
git add package.json package-lock.json README.md
git commit -m "chore: remove console-only frontend dependencies"
```

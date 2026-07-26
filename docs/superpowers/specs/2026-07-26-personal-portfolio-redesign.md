# Personal Portfolio Redesign

Date: 2026-07-26

## Objective

Replace the existing AI management console with a focused bilingual personal
portfolio for Ma Yehui. The site should present him as an independent developer
and full-stack engineer who builds useful products with the help of AI.

The design may draw structural inspiration from Brittany Chiang's portfolio,
but it must use original copy, visual details, project presentation, and motion
so that it does not read as a direct clone.

## Audience and Positioning

Primary audiences:

- Potential employers and collaborators evaluating engineering experience
- Developers and product-minded visitors discovering Ma Yehui's independent work
- Readers arriving through the personal blog or social profiles

Primary English positioning:

> Independent Developer & Full-stack Engineer
>
> Building simple, useful products from everyday ideas — with curiosity, code,
> and help from AI.

The Chinese version should preserve the restrained tone rather than translating
word for word:

> 独立开发者 / 全栈工程师
>
> 在 AI 的帮助下，把日常灵感做成简单、实用的产品。

Claims must remain factual and modest. AI should be described as a collaborative
tool, not as a substitute for the subject's engineering experience.

## Information Architecture

The desktop layout uses two columns:

- A fixed left column, approximately 38% of the content width
- A scrolling right column containing the portfolio narrative

The mobile layout becomes a natural single column with no fixed sidebar.

### Left Column

- Name: Ma Yehui / 马业辉
- Professional positioning and short introduction
- Anchor navigation: About, Experience, Projects, Writing
- Language switch: English by default, Chinese as the alternative
- GitHub, Weibo, Instagram, LinkedIn, and email links
- A subtle abstract status mark; no profile photo

### Right Column

1. **About**
   - A concise introduction to the subject's backend, full-stack, and AI Agent
     background
   - A note about turning practical ideas into products with AI-assisted
     development

2. **Experience**
   - Nanjing Sudy Technology Co., Ltd., Software Development Engineer,
     May 2024–present
   - Summarized into three themes:
     - AI content security platform and full-stack system design
     - MCP, RAG, vector search, and agent services
     - Website platform, digital assets, corpus, and model services
   - Education appears as a concise final entry:
     B.Sc. in Computer Science and Technology, Sanjiang University,
     September 2022–June 2024

3. **Projects**
   - 摸鱼日历 / Slacking Calendar — https://calendar.ismyh.cn/
   - Evenly — https://app.ismyh.cn/
   - 分手冷静室 / Relationship Cool-down Room — https://calm.ismyh.cn/
   - 歌词状态栏 / Lyrics Menu Bar — https://lyrics.ismyh.cn/
   - Each card includes a bilingual description, a small set of truthful
     technology or product tags, and a clear external-link affordance.
   - If a technology used by a project cannot be verified from local project
     material, omit the technology tag instead of guessing.

4. **Writing**
   - A focused entry to https://hexo.ismyh.cn/
   - Copy describes writing about engineering practice, product ideas, and
     experiments.
   - No fabricated post list or publication dates.

5. **Footer**
   - A short build credit for React, TypeScript, and Motion
   - A transparent note that AI assisted the site's development

## Public Links and Privacy

Publish:

- GitHub: https://github.com/AKAama
- Weibo: https://weibo.com/u/2092104395
- Instagram: https://www.instagram.com/alex_yehui/
- LinkedIn: https://www.linkedin.com/in/yehui-ma-399aa3392/
- Email: mailto:isyehui@gmail.com

Do not publish:

- Phone number from the supplied résumés
- Profile photo from the supplied résumés
- Home address or other private contact details

## Language Behavior

- English is the default on a first visit.
- The language switch updates navigation, descriptions, experience, project
  copy, writing copy, contact labels, and footer text.
- The visitor's choice is stored locally and restored on later visits.
- The document language attribute and accessible labels update with the chosen
  language.
- Product names that are brand names remain unchanged where appropriate.

## Visual Direction

- Deep navy background
- Warm off-white primary text
- Muted blue-gray secondary text
- Low-saturation teal as the main accent
- Individual restrained accent colors for project cards
- Strong typography and whitespace instead of decorative illustration
- A very subtle radial glow and fine-grain surface treatment to add depth
- No profile photo, hero illustration, model-authored SVG artwork, or generic
  stock imagery

Typography should use a reliable system-first stack that handles both English
and Chinese well. The final page should feel calm and carefully engineered,
not like an Ant Design administration interface.

## Motion and Interaction

Use Motion for React for:

- Restrained initial fade and translate
- Section reveal when content enters the viewport
- Project and experience card hover feedback
- External-link arrow movement
- Smooth language-content transitions
- A softly interpolated desktop pointer glow

Motion must remain functional rather than decorative:

- Avoid parallax, large bounces, scroll hijacking, typewriter effects, and
  scrambled text.
- Respect `prefers-reduced-motion` through Motion's reduced-motion support and
  CSS fallbacks.
- Disable pointer-specific effects on touch devices.
- Keep all content accessible when JavaScript animation is unavailable.

The active navigation item updates as the visitor scrolls. Anchor navigation
must support keyboard activation and account for mobile header spacing.

## Technical Design

Retain:

- Umi
- React
- TypeScript

Add:

- Motion for React

Remove from the frontend when no longer used:

- Ant Design and Ant Design icons
- Axios
- React Markdown and remark-gfm
- React Syntax Highlighter
- All state, forms, requests, polling, media generation, and management UI from
  the current console page

The implementation should use:

- A bilingual content module as the single source of user-facing copy
- A small page shell
- Focused components for sections, experience entries, project cards, social
  links, navigation, and language switching
- Semantic HTML with CSS Modules or a focused site stylesheet
- Browser local storage only for the language preference

The existing backend directory remains untouched. The new portfolio makes no
backend requests and does not collect visitor data.

## Accessibility and Responsive Behavior

- Meet readable contrast for all primary and secondary text
- Provide visible keyboard focus states
- Use semantic headings in a logical hierarchy
- Include a skip-to-content link
- Supply descriptive accessible names for icon-only social links
- Preserve usable hover equivalents for keyboard and touch users
- Avoid horizontal overflow at narrow viewport widths
- Ensure the fixed desktop column becomes static on smaller screens

## Testing and Acceptance Criteria

The implementation is acceptable when:

- The production build completes successfully.
- The default first-visit language is English.
- English and Chinese modes cover all visible page copy.
- A saved language preference is restored.
- All section navigation links reach the correct content.
- Active-section highlighting follows scrolling without blocking navigation.
- All five public contact links and all five content links open the intended
  destinations.
- No console management, model management, chat, media generation, or API
  request UI remains.
- No frontend request is made to the existing API server.
- Desktop and mobile layouts remain readable and free of horizontal overflow.
- Keyboard navigation exposes visible focus and reaches every interactive item.
- Reduced-motion mode removes nonessential animation.
- The phone number and résumé profile photo do not appear in the published
  frontend.

## Out of Scope

- Content management system
- Backend or database work
- Contact form
- Analytics
- Blog post ingestion or RSS parsing
- New project screenshots or generated artwork
- Deleting the existing backend repository
- Rewriting the project in Astro, Next.js, or another framework

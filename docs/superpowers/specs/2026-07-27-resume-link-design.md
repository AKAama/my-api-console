# Experience Résumé Link Design

## Goal

Add an easy-to-find link from the Experience section to the existing public résumé PDF.

## Placement and presentation

- Place the link immediately after the Experience cards.
- Keep it visually secondary to the experience content.
- Reuse the site's teal accent and restrained hover motion.
- Include a northeast arrow to communicate that the document opens separately.

## Content

- English label: `View Full Résumé`
- Chinese label: `查看完整简历`
- Destination: `/resume.pdf`

## Interaction and accessibility

- Open the PDF in a new browser tab.
- Add `rel="noreferrer"` for the external browsing context.
- Give the link a visible keyboard-focus state.
- Keep the complete localized label available to assistive technology.

## Scope

Only add the résumé link and its localized copy and styling. Do not change the résumé file, Experience content, navigation, or other sections.

## Verification

- Confirm both language labels render correctly.
- Confirm the link resolves to the existing `public/resume.pdf`.
- Run the relevant tests and production build.
- Do not commit or push.

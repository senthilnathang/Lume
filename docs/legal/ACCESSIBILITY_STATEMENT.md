# Accessibility Statement

> ⚠️ **DRAFT — verify before publishing.** This template states a target and a
> process. Before publishing, **confirm the claims with an actual audit** (axe,
> Lighthouse, manual screen-reader testing) — do not assert conformance you haven't
> verified. Replace `[BRACKETED]` placeholders.

**Effective date:** `[DATE]` · **Applies to:** `[SERVICE / DOMAIN]`

## Our commitment

`[COMPANY]` aims to make `[SERVICE]` usable by everyone, including people who rely on
assistive technologies. We target conformance with **WCAG 2.1 Level AA**.

## Conformance status

`[CHOOSE ONE — verify first:]`
- **Partially conformant** with WCAG 2.1 AA — some content does not yet fully conform; known gaps are listed below.
- *(Only claim "fully conformant" after a complete audit.)*

## Measures we take

- Semantic HTML and a logical heading hierarchy.
- Keyboard operability for interactive elements; visible focus states.
- ARIA labels on custom/interactive components.
- Color-contrast targets meeting WCAG AA.
- Form fields with associated labels and clear validation messages.
- Alt text on meaningful images.

## Known limitations

`[List known issues from your audit, e.g. "the visual page builder canvas is not yet
fully keyboard-navigable", with target remediation dates.]`

## How we test

`[Automated: axe-core / Lighthouse in CI. Manual: keyboard-only and screen-reader
(NVDA/VoiceOver) passes on key flows. Frequency: each release / quarterly.]`

## Feedback

If you encounter an accessibility barrier, contact `[ACCESSIBILITY_CONTACT_EMAIL]`.
We aim to respond within `[N]` business days and will work to provide the information
or functionality through an alternative method where possible.

## Formal complaints

`[If operating in the EU/UK/US public sector, reference the applicable enforcement
procedure, e.g. EN 301 549 / Section 508 / EAA.]`

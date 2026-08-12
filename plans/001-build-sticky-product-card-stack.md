# 001 — Build the sticky product card stack

- **Status**: DONE
- **Commit**: f035edc
- **Severity**: HIGH
- **Category**: Missed opportunities
- **Estimated scope**: 3 files, roughly 250 lines

## Problem

The `/v2` hero currently contains one static product preview. It enters once with the generic viewport reveal and then scrolls away, so it does not reproduce the reference’s layered product-story interaction.

```tsx
// components/landing/hero-v2.tsx — current
<Reveal delay={0.12} className="relative mx-auto mt-20 max-w-5xl pb-1 sm:mt-24">
  <div className="absolute inset-x-[8%] bottom-0 h-36 bg-[#dfe9ff] blur-3xl" aria-hidden />
  <div className="relative border border-[#deded8] bg-white p-3 shadow-[0_30px_80px_rgba(28,28,24,0.12)] sm:p-7">
    ...
    <PipelinePreview />
  </div>
</Reveal>
```

The existing reveal also animates the Framer Motion `y` shorthand rather than a full transform string:

```tsx
// components/landing/reveal.tsx — current
initial={{ opacity: 0, y: 36 }}
whileInView={{ opacity: 1, y: 0 }}
```

## Target

Create a scroll-driven stack of three distinct product previews immediately beneath the hero actions:

1. Pipeline overview
2. Outreach/message history
3. Follow-up workflow

The stack occupies approximately `300dvh`. Its viewport remains sticky at `top: 5rem` with `min-height: calc(100dvh - 6rem)`. As scroll progress advances, each next card moves from `translate3d(0, 18%, 0) scale(0.965)` to `translate3d(0, 0, 0) scale(1)` and changes from opacity `0` to `1`, visually covering the previous card. Previous cards remain visible behind it with a maximum scale reduction to `0.94` and vertical offset of `-1.5rem` per covered layer.

Use `useScroll`, `useTransform`, and `useReducedMotion` from Framer Motion. Apply full `transform` strings rather than `x`, `y`, or `scale` shorthand properties. Scroll-driven transforms need no duration; they track the scroll position directly. Any entry opacity transition outside scroll progress must use `cubic-bezier(0.23, 1, 0.32, 1)`.

For reduced motion, remove all scroll-linked translation and scaling. Render the three previews as normal document-flow cards with a short opacity-only reveal of `200ms ease`.

## Repo conventions to follow

- The project already uses Framer Motion in `components/landing/reveal.tsx`.
- Landing-page colors are deliberately local hardcoded neutrals and `#356df3`, avoiding changes to dashboard theme tokens.
- Product preview visuals currently live in `components/landing/pipeline-preview.tsx`; create sibling preview components under `components/landing/`.
- Use semantic `<section>` and `<article>` elements and preserve `/v2`’s light palette.

## Steps

1. Create `components/landing/product-preview-stack.tsx` as a client component. Add a container ref, `useScroll({ target: ref, offset: ["start start", "end end"] })`, and three card layers with increasing z-index values.
2. Give the outer stack `relative h-[300dvh]`; give its viewport `sticky top-20 flex min-h-[calc(100dvh-6rem)] items-center`. Keep the product frame width constrained to the existing `max-w-5xl`.
3. Map scroll intervals as pipeline `[0, 0.34]`, outreach `[0.25, 0.67]`, and follow-up `[0.58, 1]`. Drive each incoming card from `translate3d(0, 18%, 0) scale(0.965)` and opacity `0` to `translate3d(0, 0, 0) scale(1)` and opacity `1`.
4. As a subsequent layer arrives, transform the covered card toward `translate3d(0, -1.5rem, 0) scale(0.94)`. Do not animate layout properties such as `top`, `height`, or margins.
5. Extract the repeated browser/product frame from `components/landing/hero-v2.tsx` into the stack component. Keep the thin gray border, warm-white surface, and tinted shadow.
6. Create two compact sibling previews: an outreach timeline showing channel, timestamp, and message text; and a follow-up workflow showing ordered steps and statuses. Use realistic ReachFlow data and no gradients besides the existing subtle blue floor glow.
7. In `components/landing/hero-v2.tsx`, replace the current static `<Reveal>` preview block with `<ProductPreviewStack />` outside the hero copy’s reveal wrapper.
8. Use `useReducedMotion()`. When true, render previews in a `space-y-6` flow without sticky positioning, translation, or scale; allow opacity feedback only.
9. Ensure the sticky stack is disabled below the `md` breakpoint if the three previews cannot remain readable at mobile widths. Mobile must show all previews sequentially with no overlap.

## Boundaries

- Do NOT alter dashboard CRM components or data fetching.
- Do NOT change hero copy, pricing, navigation, or footer.
- Do NOT add dependencies; Framer Motion is already installed.
- Do NOT use GSAP, custom requestAnimationFrame loops, or smooth-scroll interception.
- Do NOT animate `top`, `height`, `margin`, or other layout properties.
- If files have materially drifted since commit `f035edc`, STOP and report instead of improvising.

## Verification

- **Mechanical**: run `.\\node_modules\\.bin\\eslint.cmd components/landing/product-preview-stack.tsx components/landing/hero-v2.tsx`, `.\\node_modules\\.bin\\tsc.cmd --noEmit`, and `npm run build`; all must exit successfully.
- **Feel check**: open `/v2` at desktop width and scroll from the hero actions through the stack. Confirm:
  - The pipeline stays pinned while the outreach preview rises from behind and fully covers it.
  - The follow-up preview repeats the same behavior and becomes the final top layer.
  - No card jumps when entering or leaving sticky mode.
  - Reversing scroll reverses the stack continuously with no restarted keyframes.
  - Chrome Performance shows transforms and opacity only during the interaction.
  - At 10% playback/scrub speed, card edges remain aligned and no two layers flicker.
  - With `prefers-reduced-motion: reduce`, previews appear in normal flow with no positional movement.
  - At mobile width, all previews remain readable and the page never creates horizontal overflow.
- **Done when**: three distinct product pages stack in order beneath the hero, each incoming page visibly rises from behind and covers the current page, normal scrolling resumes after the final page, and reduced-motion/mobile fallbacks are stable.

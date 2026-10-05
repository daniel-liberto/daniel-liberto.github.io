# Daniel Liberto · Portfolio v2

The portfolio of **Daniel Liberto de Almeida**, UI/UX Designer & Front-end Engineer. The site is about one idea: *design that compiles*. It reads like a Figma file that turns into a working product as you scroll, and at the end you find out it really was a Figma file.

## The story, section by section

| # | Section | What happens |
|---|---------|--------------|
| 00 | Preloader | A Figma frame is dragged across the screen. Its live `W × H` label is the progress bar. |
| 01 | Hero | The photo split into real layers (room, "Daniel", Daniel cut out with a Vision person mask, "Liberto" + UI). The name passes behind and in front of him, the pointer gives depth parallax and a green rim light, and scrolling explodes the layers into an isometric Figma-style layer view. |
| 02 | Manifesto | A multiplayer cursor named *Daniel* typesets the statement as you read (GSAP Flip reflow). |
| 03 | Process | One wallet card: Rough.js scribble, annotated Figma component, typed TSX, live product, then a zoom into the card. |
| 04 | Work | A horizontal track with WebGL planes that ends on a paper screen, which becomes the services section. |
| 05 | Services | A deck of five cards, each with a live demo: a user flow, a design-system variant matrix with theme tokens, Lighthouse targets + build log, an interactive bézier editor with this site's own eases, and a phone receiving a push next to Node logs. Then a Matter.js toolbox. |
| 06 | Release notes | The career as a changelog with a git graph drawn on scroll. |
| 07 | Contact → the Figma file | The contact screen shrinks into a frame of this site's own Figma file. Daniel joins, the camera follows him and he leaves a comment. You can pan and zoom the canvas. |
| 08 | Post-credits | A closed curtain asks you to keep scrolling, then the "anatomy of a designer who codes" plays as an extra: the selfie as a spec sheet, with an 800% pixel-grid zoom on the glasses. |

Case pages (`/work/:id`) share the same Lenis instance. A cover expands into the page hero, the gallery scrolls horizontally, and the next case grows until it opens on its own.

## Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 8
· Three.js + React Three Fiber (custom GLSL)
· GSAP (ScrollTrigger, SplitText, Flip, DrawSVG, ScrambleText, CustomEase)
· Lenis (one smooth scroll for every route, driven by the GSAP ticker)
· Matter.js, Rough.js, @use-gesture, Tone.js (generative UI sound, lazy-loaded), Zustand

## Scripts

```bash
npm run dev       # http://localhost:5174
npm run build     # type-check, build, copy index.html → 404.html for GitHub Pages deep links
npm run lint
```

The frames inside the Figma-file finale are real screenshots of the site. Re-capture them after visual changes, with the dev server running. This needs Chrome and `cwebp`:

```bash
node scripts/capture-frames.mjs
```

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.

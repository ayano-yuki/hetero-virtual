# Project Rules

This repository is a library-shaped prototype, not a polished public npm
package yet. Keep the project optimized for measurable proof before release
polish.

## North Star

The primary goal is to prove, with browser evidence, that heterogeneous
dynamic-height lists can scroll bidirectionally with low jank.

Validated targets:

* 50,000 mixed text, markdown, image, chart, and tool-result rows in Next.js
* prepend viewport shift below `1px`
* resize correction viewport shift below `1px`
* Chrome CPU throttle 4x fast-scroll p95 JS frame time below `6ms`
* no blank viewport when heavy items are deferred

## Repository Roles

Use the role-based top-level layout:

```txt
library/
  core/
  react/
demo/
  next-basic/
playground/
  benchmark/
  private-trial/
  evidence/
documents/
```

Keep browser-captured benchmark evidence under `playground/evidence/`.

## API Direction

Prefer explicit adapter contracts over convenient but opaque child rendering.
Item type, height estimation, render cost, render levels, and measurement
behavior must stay visible to the virtualizer.

Avoid this shape:

```tsx
<HeteroVirtual>
  {items.map((item) => <AnyComponent />)}
</HeteroVirtual>
```

That API hides the metadata needed for dynamic height correction and
jank-resistant scheduling.

## Package Names

Keep the internal package names aligned with the intended public names:

```txt
@hetero-virtual/core
@hetero-virtual/react
```

## Publish Rule

Do not publish to npm until the project remains reviewable beside established
virtual scrolling libraries with reproducible examples, constraints, and
browser evidence.

The current publish-gate evidence is complete and stored in
`playground/evidence/`.

## Not Now

Do not add these until performance evidence and API direction require them:

* changesets
* npm publish workflow
* storybook
* typedoc
* visual regression
* multi-framework support
* Vue adapter
* Svelte adapter
* SSR examples
* complex CI matrix

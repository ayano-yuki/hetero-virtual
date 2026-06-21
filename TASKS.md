# Public Npm Publish Gate Tasks

Status: in progress

This file tracks publish-gate execution separately from `Todo.md`. The goal is
not to publish to npm yet. The goal is to make the project reviewable beside
existing virtual scrolling libraries with reproducible evidence, examples, and
clear constraints.

## PPG-01 Similar Library Comparison

- [x] Define comparison targets: TanStack Virtual, react-window,
  vue-virtual-scroller
- [x] Document comparison axes: heterogeneous DOM, dynamic height correction,
  prepend anchor preservation, heavy item hydration, evidence reproducibility
- [x] Add a benchmark evidence shape that can identify the measured library
- [ ] Record real comparison evidence for at least one React library under the
  same browser and CPU throttle conditions

## PPG-02 Prepend Anchor Stability

- [x] Keep live prepend viewport shift visible in `/benchmark`
- [x] Include `viewportShift` in copied benchmark evidence
- [ ] Capture and store real browser evidence showing prepend shift `< 1px`

## PPG-03 Resize Correction Stability

- [x] Keep resize correction viewport shift visible in `/benchmark`
- [x] Include delayed image and high-variance scenarios in benchmark controls
- [ ] Capture and store real browser evidence showing resize shift `< 1px`

## PPG-04 Markdown / Image / Heavy Mixed Demo Evidence

- [x] Provide markdown/code, image, and chart/tool-result benchmark presets
- [x] Include dataset and scenario identity in copied evidence
- [x] Add heavy blank-frame and placeholder-only diagnostics
- [ ] Capture and store real browser evidence for each heterogeneous preset

## PPG-05 CPU Throttle Evidence

- [x] Keep low-end 4ms budget control in `/benchmark`
- [x] Include `cpuThrottle` and `p95JsFrameTime` in copied evidence
- [ ] Capture and store Chrome CPU throttle 4x evidence JSON

## PPG-06 README Constraints

- [x] Explain that npm publish is intentionally gated
- [x] Document strengths, constraints, non-goals, and measurement commands
- [x] Link benchmark and comparison documentation from README

## PPG-07 Examples

- [x] Add `examples/next-basic`
- [x] Use `@hetero-virtual/core` and `@hetero-virtual/react` as workspace
  dependencies
- [x] Include the example in recursive typecheck

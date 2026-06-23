# Public Npm Publish Gate Tasks

Status: in progress

This file tracks publish-gate execution separately from `Todo.md`. The goal is
not to publish to npm yet. The goal is to make the project reviewable beside
existing virtual scrolling libraries with reproducible evidence, examples, and
clear constraints.

## PPG-01 Similar Library Comparison

- [x] Define comparison targets: React Virtuoso, react-window,
  vue-virtual-scroller, TanStack Virtual
- [x] Document comparison axes: heterogeneous DOM, dynamic height correction,
  prepend anchor preservation, heavy item hydration, evidence reproducibility
- [x] Add a benchmark evidence shape that can identify the measured library
- [x] Add comparison matrix for React Virtuoso, react-window,
  vue-virtual-scroller, TanStack Virtual, and hetero-virtual
- [x] Add `/benchmark` React comparison runner for React Virtuoso,
  react-window, and TanStack Virtual
- [x] Record real comparison evidence for at least one React library under the
  same browser and CPU throttle conditions
  - Evidence:
    `evidence/2026-06-23/react-virtuoso-fast-scroll-4x.json`,
    `evidence/2026-06-23/react-window-fast-scroll-4x.json`,
    `evidence/2026-06-23/tanstack-virtual-fast-scroll-4x.json`
  - Result: React Virtuoso p95 `2.30ms`, react-window p95 `0.50ms`,
    TanStack Virtual p95 `4.50ms`; all have `sampleCount = 90`, queue `0`,
    and blank frames `0`.

## PPG-02 Prepend Anchor Stability

- [x] Keep live prepend viewport shift visible in `/benchmark`
- [x] Include `viewportShift` in copied benchmark evidence
- [x] Capture and store real browser evidence showing prepend shift `< 1px`
  - Evidence: `evidence/2026-06-21/markdown-prepend-stability.json`
  - Result: `viewportShift = 0.40px`

## PPG-03 Resize Correction Stability

- [x] Keep resize correction viewport shift visible in `/benchmark`
- [x] Include delayed image and high-variance scenarios in benchmark controls
- [x] Capture and store real browser evidence showing resize shift `< 1px`
  - Evidence: `evidence/2026-06-21/image-resize-high-variance.json`
  - Result: `viewportShift = 0px`, `measurementQueue = 0`

## PPG-04 Markdown / Image / Heavy Mixed Demo Evidence

- [x] Provide markdown/code, image, and chart/tool-result benchmark presets
- [x] Include dataset and scenario identity in copied evidence
- [x] Add heavy blank-frame and placeholder-only diagnostics
- [x] Capture and store real browser evidence for each heterogeneous preset
  - Evidence:
    `evidence/2026-06-21/markdown-fast-scroll-incomplete.json`,
    `evidence/2026-06-21/image-resize-high-variance.json`,
    `evidence/2026-06-21/heavy-fast-scroll-incomplete.json`
  - Note: markdown and heavy fast-scroll files are stability evidence only;
    `sampleCount = 0`, so they do not satisfy p95 evidence.

## PPG-05 CPU Throttle Evidence

- [x] Keep low-end 4ms budget control in `/benchmark`
- [x] Include `cpuThrottle` and `p95JsFrameTime` in copied evidence
- [x] Capture and store Chrome CPU throttle 4x evidence JSON
  - Evidence: `evidence/2026-06-21/plain-text-fast-scroll-4x.json`
  - Result: `p95JsFrameTime = 0.60ms`, `sampleCount = 96`
  - Benchmark sample capture has been stabilized for the next measurement run.

## PPG-06 README Constraints

- [x] Explain that npm publish is intentionally gated
- [x] Document strengths, constraints, non-goals, and measurement commands
- [x] Link benchmark and comparison documentation from README

## PPG-07 Examples

- [x] Add `examples/next-basic`
- [x] Use `@hetero-virtual/core` and `@hetero-virtual/react` as workspace
  dependencies
- [x] Include the example in recursive typecheck

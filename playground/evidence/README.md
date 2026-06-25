# Benchmark Evidence

This directory stores browser-captured evidence for the Public Npm Publish
Gate. Evidence files should be copied from `/benchmark` after the scenario has
settled.

## Naming

Use this layout:

```txt
playground/evidence/YYYY-MM-DD/<dataset-or-scenario>.json
playground/evidence/YYYY-MM-DD/README.md
```

Use `*-incomplete.json` when a scenario captured useful stability data but is
not valid for p95 frame-time comparison, usually because `sampleCount` is `0`.

## Required Pass Signals

For a complete publish-gate performance evidence file:

```json
{
  "frameTimePassed": true,
  "viewportShiftPassed": true,
  "measurementQueuePassed": true,
  "heavyBlankFramePassed": true
}
```

`sampleCount` must be greater than `0` before `p95JsFrameTime` is considered
valid. Stability evidence can still be useful with `sampleCount: 0` when the
task is specifically about viewport shift, measurement queue, or blank frames.

If a fast-scroll capture produces `sampleCount: 0`, repeat the run. Confirm
that the benchmark panel shows **Frame samples** increasing before copying the
JSON.

## Manual Capture

1. Run `pnpm dev`.
2. Open `http://localhost:3000/benchmark`.
3. Set Chrome CPU throttling when the task requires it.
4. Run the target scenario.
5. Wait for the measurement queue to settle.
6. Click **Copy evidence JSON**.
7. Save the copied JSON in a dated folder.

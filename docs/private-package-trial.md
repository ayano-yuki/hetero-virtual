# Private Package Trial

Phase 10 validates `@hetero-virtual/core` and `@hetero-virtual/react` from a
separate workspace package before considering public npm polish.

## Trial Project

`apps/private-trial` is a private workspace package that depends on:

```json
{
  "@hetero-virtual/core": "workspace:*",
  "@hetero-virtual/react": "workspace:*"
}
```

The trial avoids the demo app and imports the packages through their public
entrypoints. Its smoke tests build an adapter registry, create a
`VirtualizerStore`, compute a visible range, and type-check the
`useHeteroVirtualizer` option shape without mounting React.

## API Pain Found

* `getEstimatedHeight` in the React package felt inconsistent next to the core
  adapter contract, which already uses `estimateHeight`.
* `VirtualizerSnapshot.items` was easy to confuse with the input `items`.
  Consumers need a stronger signal that the returned list is the current
  virtual range, not the source collection.

## Breaking Revisions

1. `getEstimatedHeight` was renamed to `estimateHeight`.
   This makes the hook and store API match `VirtualItemAdapter.estimateHeight`.
2. `VirtualizerSnapshot.items` was renamed to `virtualItems`.
   This separates source item arrays from visible and overscan metadata.

These are intentionally small breaking changes while the package is still
private. The result is less surprising for external callers and easier to read
inside render loops.

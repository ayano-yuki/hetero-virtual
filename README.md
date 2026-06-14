# hetero-virtual

A jank-resistant virtualizer for heterogeneous, bidirectional, dynamic-height lists.

`hetero-virtual` is an experimental virtual scrolling engine for lists where each item may have a different DOM structure, rendering cost, and height behavior.

## What it is

* Handles heterogeneous item types such as text, markdown, images, charts, and tool outputs.
* Supports dynamic heights and bidirectional infinite scroll.
* Preserves scroll position during prepend and height corrections.
* Reduces jank by scheduling measurement and hydration around browser budgets.

## Documentation

* [Overview](docs/overview.md)
* [Concepts](docs/concepts.md)
* [Architecture](docs/architecture.md)
* [React API](docs/react-api.md)
* [Demo & Examples](docs/demo.md)
* [Strategy](docs/strategy.md)

## Quick start

```bash
pnpm install
pnpm dev
```

Then open:

```txt
http://localhost:3000
```

The benchmark foundation is available at:

```txt
http://localhost:3000/benchmark
```

The benchmark page includes a live placeholder virtualizer with 50,000
variable-height rows, prepend anchor preservation, viewport shift metrics, and
a fast-scroll scenario.

## Workspace

```txt
apps/
  demo-next/   Next.js demo and benchmark pages
packages/
  core/        Framework-independent virtualizer core
  react/       React and DOM integration
```

Useful commands:

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Notes

This repository is a prototype design for a measurable Next.js demo rather than a polished production package.

## License

MIT

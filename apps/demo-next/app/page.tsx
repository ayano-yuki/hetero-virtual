import Link from "next/link"

import { CORE_PACKAGE_NAME } from "@hetero-virtual/core"
import { REACT_PACKAGE_NAME } from "@hetero-virtual/react"

export default function HomePage() {
  return (
    <main className="pageShell">
      <section className="hero">
        <p className="eyebrow">Demo-first foundation</p>
        <h1>hetero-virtual</h1>
        <p className="lede">
          A measurable prototype for heterogeneous, bidirectional,
          dynamic-height virtual scrolling.
        </p>
        <Link className="primaryLink" href="/benchmark">
          Open benchmark foundation
        </Link>
      </section>

      <section className="packageGrid" aria-label="Workspace packages">
        <article className="panel">
          <p className="panelLabel">Core package</p>
          <code>{CORE_PACKAGE_NAME}</code>
          <p>Framework-independent layout and scheduling algorithms.</p>
        </article>
        <article className="panel">
          <p className="panelLabel">React package</p>
          <code>{REACT_PACKAGE_NAME}</code>
          <p>React hooks and DOM integration built on the core package.</p>
        </article>
      </section>
    </main>
  )
}

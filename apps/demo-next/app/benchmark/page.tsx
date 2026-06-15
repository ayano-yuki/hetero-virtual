import Link from "next/link"

import { PlaceholderVirtualizer } from "./PlaceholderVirtualizer"

const scenarios = [
  {
    count: "100,000",
    label: "Plain text items",
    status: "Live",
  },
  {
    count: "50,000",
    label: "Markdown and code items",
    status: "Live",
  },
  {
    count: "20,000",
    label: "Image card mix",
    status: "Live",
  },
  {
    count: "10,000",
    label: "Chart and tool-result items",
    status: "Live",
  },
] as const

const metrics = [
  ["p95 JS frame time", "<= 6 ms"],
  ["Viewport shift", "< 1 px"],
  ["Rendered items", "Live"],
  ["Measurement queue", "Live"],
] as const

export default function BenchmarkPage() {
  return (
    <main className="pageShell">
      <header className="benchmarkHeader">
        <div>
          <p className="eyebrow">Benchmark evidence suite</p>
          <h1>Performance scenarios</h1>
          <p className="lede">
            Select a dataset, run mutation and scroll scenarios, then copy a
            reproducible evidence snapshot.
          </p>
        </div>
        <Link className="secondaryLink" href="/">
          Back to overview
        </Link>
      </header>

      <section className="metricsGrid" aria-label="Target metrics">
        {metrics.map(([label, value]) => (
          <article className="metricCard" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <PlaceholderVirtualizer />

      <section className="scenarioSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Initial suite</p>
            <h2>Benchmark scenarios</h2>
          </div>
          <span className="phaseBadge">Phase 9</span>
        </div>

        <div className="scenarioGrid">
          {scenarios.map((scenario) => (
            <article className="scenarioCard" key={scenario.label}>
              <span className="statusBadge">{scenario.status}</span>
              <strong>{scenario.count}</strong>
              <p>{scenario.label}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

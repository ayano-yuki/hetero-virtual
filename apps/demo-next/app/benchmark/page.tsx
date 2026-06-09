import Link from "next/link"

const scenarios = [
  {
    count: "100,000",
    label: "Plain text items",
    status: "Planned",
  },
  {
    count: "50,000",
    label: "Markdown and code items",
    status: "Planned",
  },
  {
    count: "20,000",
    label: "Image card mix",
    status: "Planned",
  },
  {
    count: "10,000",
    label: "Chart and tool-result items",
    status: "Planned",
  },
] as const

const metrics = [
  ["p95 JS frame time", "<= 6 ms"],
  ["Viewport shift", "< 1 px"],
  ["Rendered items", "Pending"],
  ["Measurement queue", "Pending"],
] as const

export default function BenchmarkPage() {
  return (
    <main className="pageShell">
      <header className="benchmarkHeader">
        <div>
          <p className="eyebrow">Benchmark foundation</p>
          <h1>Performance scenarios</h1>
          <p className="lede">
            This page reserves the scenarios and metrics that later phases will
            connect to the virtualizer.
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

      <section className="scenarioSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Initial suite</p>
            <h2>Benchmark scenarios</h2>
          </div>
          <span className="phaseBadge">Phase 1</span>
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

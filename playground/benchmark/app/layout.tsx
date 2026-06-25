import type { Metadata } from "next"
import type { ReactNode } from "react"

import "./globals.css"

export const metadata: Metadata = {
  title: "hetero-virtual benchmark",
  description: "Benchmark foundation for heterogeneous virtual scrolling.",
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

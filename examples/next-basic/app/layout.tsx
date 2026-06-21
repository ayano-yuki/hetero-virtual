import type { Metadata } from "next"
import type { ReactNode } from "react"

import "./styles.css"

export const metadata: Metadata = {
  title: "hetero-virtual basic example",
  description: "A minimal Next.js consumer for @hetero-virtual/react.",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

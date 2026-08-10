import { render } from "@react-email/components"
import * as React from "react"

export type AlertDigestProps = {
  field?: string | null
  country?: string | null
  frequency: string
  bips: Array<{ slug: string; title: string; hostName: string; hostCity?: string | null; ects?: number | null }>
  unsubscribeUrl: string
  siteUrl: string
}

export function AlertDigest({ field, country, frequency, bips, unsubscribeUrl, siteUrl }: AlertDigestProps) {
  const criteria = [field, country].filter(Boolean).join(" or ")
  return React.createElement(
    "div",
    { style: { fontFamily: "Inter, Arial, sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px", background: "#ffffff", color: "#0a1735" } },
    React.createElement("h1", { style: { fontSize: "20px", fontWeight: 700, color: "#003399", margin: "0 0 8px" } }, "New BIPs matching your alert"),
    React.createElement("p", { style: { fontSize: "14px", color: "#555", margin: "0 0 16px" } }, `You subscribed to ${criteria} — ${frequency} digest.`),
    React.createElement(
      "ul",
      { style: { paddingLeft: "20px", margin: "0 0 16px" } },
      ...bips.map((b) =>
        React.createElement(
          "li",
          { key: b.slug, style: { margin: "8px 0" } },
          React.createElement("a", { href: `${siteUrl}/bip/${b.slug}`, style: { color: "#003399", fontWeight: 600, textDecoration: "none" } }, b.title),
          ` — ${b.hostName}${b.hostCity ? ` — ${b.hostCity}` : ""} · ${b.ects ?? ""} ECTS`,
        ),
      ),
    ),
    React.createElement(
      "p",
      { style: { fontSize: "13px", color: "#666", marginTop: "24px", borderTop: "1px solid #eee", paddingTop: "12px" } },
      React.createElement("a", { href: unsubscribeUrl, style: { color: "#003399" } }, "Unsubscribe from this alert"),
      " — or manage all alerts in your ",
      React.createElement("a", { href: `${siteUrl}/student-dashboard`, style: { color: "#003399" } }, "dashboard"),
      ".",
    ),
    React.createElement("p", { style: { fontSize: "11px", color: "#888", marginTop: "8px" } }, "BipHub · Independent project — not affiliated with the European Commission"),
  )
}

export async function renderAlertDigest(props: AlertDigestProps): Promise<string> {
  return await render(React.createElement(AlertDigest, props))
}

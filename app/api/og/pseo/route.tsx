import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

function safeText(value: string | null, fallback: string, max = 120) {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

export async function GET(request: NextRequest) {
  const title = safeText(request.nextUrl.searchParams.get("title"), "AyoMagic AI Template", 100);
  const subtitle = safeText(
    request.nextUrl.searchParams.get("subtitle"),
    "Examples · Prompts · Model Comparison",
    120
  );
  const snippet = safeText(
    request.nextUrl.searchParams.get("snippet"),
    "See prompt examples, sample outputs, and practical tips before using the tool.",
    180
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          background:
            "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.25), transparent 45%), radial-gradient(circle at 80% 20%, rgba(244,114,182,0.18), transparent 40%), #0a0a0a",
          color: "#f8fafc",
          padding: "56px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "24px",
            padding: "40px",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "inline-flex",
                fontSize: "22px",
                color: "#cbd5e1",
                letterSpacing: "0.08em",
              }}
            >
              AYOMAGIC • PROGRAMMATIC SEO
            </div>
            <div
              style={{
                fontSize: "56px",
                fontWeight: 700,
                lineHeight: 1.05,
                maxWidth: "1020px",
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: "24px", color: "#cbd5e1" }}>{subtitle}</div>
          </div>

          <div
            style={{
              display: "flex",
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              padding: "20px 24px",
              fontSize: "20px",
              color: "#e2e8f0",
              lineHeight: 1.35,
            }}
          >
            {snippet}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}


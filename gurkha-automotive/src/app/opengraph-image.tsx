import { ImageResponse } from "next/og";
import { BUSINESS } from "@/lib/constants";

export const alt = `${BUSINESS.name} — Honest car care in Melbourne's west`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAFAF9",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 6,
            color: "#1E7A3C",
            marginBottom: 24,
          }}
        >
          SUNSHINE NORTH, VIC
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#1E7A3C" }}>GURKHA&nbsp;</span>
          <span style={{ color: "#AC1F1F" }}>AUTOMOTIVE</span>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 36,
            color: "#4B5563",
            marginTop: 32,
          }}
        >
          Honest car care in Melbourne&apos;s west
        </div>

        <div style={{ display: "flex", marginTop: 44 }}>
          <div style={{ display: "flex", width: 90, height: 10, backgroundColor: "#1E7A3C", borderRadius: 5 }} />
          <div style={{ display: "flex", width: 90, height: 10, backgroundColor: "#AC1F1F", borderRadius: 5, marginLeft: 8 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}

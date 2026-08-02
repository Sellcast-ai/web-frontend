import { ImageResponse } from "next/og";

export const alt = "Lumi - product links in, publish-ready video out";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fbf8f3",
          color: "#151515",
          padding: "72px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: 999,
                background: "linear-gradient(125deg, #0f6c7a 0%, #157e8f 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4.5" fill="white" />
                {Array.from({ length: 8 }).map((_, i) => {
                  const a = (i * Math.PI) / 4;
                  const x1 = 12 + Math.cos(a) * 7.4;
                  const y1 = 12 + Math.sin(a) * 7.4;
                  const x2 = 12 + Math.cos(a) * 9.6;
                  const y2 = 12 + Math.sin(a) * 9.6;
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="white"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
            </div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>
              Lumi
            </div>
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 760,
              fontSize: 78,
              lineHeight: 0.96,
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            Product links in. Publish-ready video out.
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 710,
              fontSize: 30,
              lineHeight: 1.35,
              color: "#3a3a3e",
            }}
          >
            Scripted from real category patterns, reviewed shot by shot, rendered for shoppable video.
          </div>
        </div>
        <div
          style={{
            width: 268,
            height: 476,
            borderRadius: 42,
            background: "#0b0e11",
            padding: 18,
            boxShadow: "0 28px 70px rgba(15, 108, 122, 0.28)",
            display: "flex",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 28,
              background:
                "linear-gradient(180deg, #8be5fc 0%, #dffaff 42%, #0f6c7a 100%)",
              display: "flex",
              alignItems: "flex-end",
              padding: 24,
            }}
          >
            <div
              style={{
                width: "100%",
                borderRadius: 18,
                background: "rgba(11, 14, 17, 0.78)",
                color: "white",
                padding: 18,
                fontSize: 22,
                fontWeight: 700,
                display: "flex",
              }}
            >
              Ready to publish
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

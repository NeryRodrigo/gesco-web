import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VORDIA — Software de gestión empresarial en Paraguay";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "#020407",
          color: "#F5F7FA",
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: "0.28em", color: "#5eb0ff", fontWeight: 600 }}>
          VORDIA
        </div>
        <div style={{ marginTop: 28, fontSize: 58, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
          Software de gestión empresarial en Paraguay
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: "#3d8fff", fontWeight: 700 }}>
          Muchas partes. Una sola operación.
        </div>
      </div>
    ),
    { ...size }
  );
}

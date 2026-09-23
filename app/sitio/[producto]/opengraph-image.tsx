import { ImageResponse } from "next/og";
import { productoPorSlug } from "@/lib/vordiaProductos";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ producto: string }>;
}) {
  const { producto } = await params;
  const p = productoPorSlug(producto);
  const codigo = p?.codigo ?? "VORDIA";
  const h1 = p?.h1 ?? "Software de gestión empresarial";

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
          VORDIA {codigo}
        </div>
        <div style={{ marginTop: 28, fontSize: 52, fontWeight: 800, lineHeight: 1.12, maxWidth: 960 }}>
          {h1}
        </div>
        <div style={{ marginTop: 24, fontSize: 26, color: "#AAB3C0" }}>
          Muchas partes. Una sola operación.
        </div>
      </div>
    ),
    { ...size }
  );
}

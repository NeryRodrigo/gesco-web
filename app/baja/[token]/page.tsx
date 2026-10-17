"use client";

import { use, useState } from "react";
import { CheckCircle2, Loader2, MailX } from "lucide-react";
import { API_BASE } from "@/lib/api";

/** Baja de comunicaciones comerciales desde el link del correo: se confirma con un botón (los antivirus abren los links solos). */
export default function BajaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [estado, setEstado] = useState<"inicio" | "enviando" | "listo" | "error">("inicio");
  const [mensaje, setMensaje] = useState("");

  const confirmar = async () => {
    setEstado("enviando");
    try {
      const res = await fetch(`${API_BASE}/api/public/bajas/${encodeURIComponent(token)}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setMensaje(data.mensaje ?? "");
      setEstado(res.ok ? "listo" : "error");
    } catch {
      setMensaje("No pudimos registrar la baja. Probá de nuevo en unos minutos o respondé el correo con la palabra BAJA.");
      setEstado("error");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020407] px-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#050B18] p-8 text-center">
        {estado === "listo" ? (
          <>
            <CheckCircle2 className="mx-auto text-emerald-400" size={40} />
            <h1 className="mt-4 text-xl font-semibold">Baja registrada</h1>
            <p className="mt-2 text-[14px] text-white/60">{mensaje}</p>
          </>
        ) : (
          <>
            <MailX className="mx-auto text-[#5eb0ff]" size={40} />
            <h1 className="mt-4 text-xl font-semibold">Dejar de recibir correos de VORDIA</h1>
            <p className="mt-2 text-[14px] text-white/60">Confirmá y no te volvemos a enviar comunicaciones comerciales a esta dirección.</p>
            {estado === "error" && <p className="mt-4 text-[13px] text-red-300">{mensaje || "El link de baja no es válido."}</p>}
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={estado === "enviando"}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#006CFF] px-5 py-3 text-[14px] font-semibold disabled:opacity-60"
            >
              {estado === "enviando" ? <Loader2 size={16} className="animate-spin" /> : null} Confirmar baja
            </button>
          </>
        )}
        <a href="/privacidad" className="mt-6 inline-block text-[12px] text-white/40 hover:text-white/70">
          Política de privacidad
        </a>
      </div>
    </main>
  );
}

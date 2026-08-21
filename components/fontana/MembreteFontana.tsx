/** Membrete Fontana Di Luque + pie Vordia (mismo patrón que expediente / correos). */

type MembreteProps = {
  titulo: string;
  subtitulo?: string;
  meta?: { label: string; value: string }[];
};

export function MembreteFontanaDiLuque({ titulo, subtitulo, meta }: MembreteProps) {
  return (
    <div className="flex items-center justify-between gap-3.5 border-b-2 border-[#0f172a] pb-3 mb-5 bg-white">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-[72px] h-[72px] rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
          style={{ backgroundColor: "#080E1E" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fontanas.png"
            alt="Fontana Di Luque"
            width={60}
            height={60}
            className="w-[60px] h-[60px] object-contain"
          />
        </div>
        <div className="min-w-0 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1E7BFF] m-0 mb-1">
            {titulo}
          </p>
          {subtitulo && (
            <p className="text-[9px] text-[#64748b] m-0 mb-1 italic">{subtitulo}</p>
          )}
          {meta && meta.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] leading-snug text-[#0f172a]">
              {meta.map((m) => (
                <div key={m.label}>
                  <span className="text-[#64748b]">{m.label}:</span>{" "}
                  <strong>{m.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="m-0 text-[11px] font-black tracking-[0.2em] uppercase text-[#0f172a]">
          Fontana
        </p>
        <p className="m-0 text-[9px] text-[#64748b]">Di Luque · Est. 2020</p>
      </div>
    </div>
  );
}

export function PieVordiaFontana() {
  return (
    <div className="flex items-center justify-end border-t-2 border-[#0f172a] pt-2.5 mt-8 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/VORDIA H NEGRO.png"
        alt="Vordia"
        width={64}
        height={64}
        className="h-[48px] w-[48px] object-contain shrink-0"
        style={{
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      />
    </div>
  );
}

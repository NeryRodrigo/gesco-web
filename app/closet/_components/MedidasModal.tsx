"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import { BOTON, BOTON_PRIMARIO, Campo, CAMPO, Modal, TEXTO_SUAVE } from "@/components/boutique/BoutiqueUI";
import { useMedidas } from "./ClosetUI";

/** "Mis medidas": se guardan solo en este celular y sirven para recomendar el talle en cada prenda. */
export function MedidasModal({ onClose }: { onClose: () => void }) {
  const { medidas, guardar } = useMedidas();
  const [busto, setBusto] = useState(medidas.busto ? String(medidas.busto) : "");
  const [cintura, setCintura] = useState(medidas.cintura ? String(medidas.cintura) : "");
  const [cadera, setCadera] = useState(medidas.cadera ? String(medidas.cadera) : "");
  const num = (v: string) => (Number(v) >= 40 && Number(v) <= 200 ? Number(v) : undefined);

  return (
    <Modal titulo="Tus medidas, tu talle" onClose={onClose} ancho="sm:max-w-md">
      <p className={`text-[13px] ${TEXTO_SUAVE}`}>
        Medite con una cinta métrica (en centímetros). Las comparamos con las medidas reales de cada prenda y te decimos qué talle te queda mejor. Se guardan solo en este celular.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Campo label="Busto"><input className={CAMPO} inputMode="numeric" value={busto} onChange={(e) => setBusto(e.target.value.replace(/\D/g, ""))} placeholder="88" /></Campo>
        <Campo label="Cintura"><input className={CAMPO} inputMode="numeric" value={cintura} onChange={(e) => setCintura(e.target.value.replace(/\D/g, ""))} placeholder="70" /></Campo>
        <Campo label="Cadera"><input className={CAMPO} inputMode="numeric" value={cadera} onChange={(e) => setCadera(e.target.value.replace(/\D/g, ""))} placeholder="96" /></Campo>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => { guardar({}); onClose(); }} className={BOTON}>Borrar</button>
        <button type="button" onClick={() => { guardar({ busto: num(busto), cintura: num(cintura), cadera: num(cadera) }); onClose(); }} className={BOTON_PRIMARIO}>
          <Ruler size={15} /> Guardar
        </button>
      </div>
    </Modal>
  );
}

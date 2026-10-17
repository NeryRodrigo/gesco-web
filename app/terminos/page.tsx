import type { Metadata } from "next";
import { CanalContacto, DocumentoLegal } from "../web-institucional/DocumentoLegal";
import { identificacionVordia } from "@/lib/vordiaLegal";

export const metadata: Metadata = {
  title: "Términos y Condiciones | VORDIA",
  description: "Condiciones de uso del sitio y de las plataformas de gestión VORDIA.",
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <DocumentoLegal
      titulo="Términos y Condiciones"
      intro="Estas condiciones regulan el uso de www.vordia.com.py y de las plataformas de gestión VORDIA. Si tu empresa firmó un contrato o aceptó una propuesta con condiciones particulares, esas condiciones prevalecen sobre estas en lo que las modifiquen."
    >
      <section>
        <h2>1. Quiénes somos</h2>
        <p>
          El servicio lo presta {identificacionVordia()} (“VORDIA”). Contacto: <CanalContacto />.
        </p>
      </section>

      <section>
        <h2>2. El servicio</h2>
        <p>
          VORDIA ofrece software de gestión en la nube por suscripción (por ejemplo, para condominios, alojamiento, gastronomía, comercio, logística y agro),
          además de implementación, capacitación y soporte. El alcance, los módulos, el precio y los plazos de cada cliente se definen en su propuesta o
          pedido aceptado.
        </p>
      </section>

      <section>
        <h2>3. Cuentas y acceso</h2>
        <ul>
          <li>Las cuentas son personales. Cada empresa cliente es responsable de quiénes tienen acceso y con qué rol.</li>
          <li>Las contraseñas no deben compartirse. Ante un acceso indebido, avisanos de inmediato para bloquear la cuenta.</li>
          <li>Podemos suspender una cuenta ante un uso que ponga en riesgo la seguridad del servicio o de otros clientes.</li>
        </ul>
      </section>

      <section>
        <h2>4. Uso aceptable</h2>
        <p>
          No está permitido usar el servicio para fines ilícitos, cargar datos sin la base legal necesaria, intentar acceder a datos de otras empresas,
          interferir con la plataforma o revender el acceso sin autorización escrita.
        </p>
      </section>

      <section>
        <h2>5. Datos del cliente</h2>
        <p>
          Los datos que carga cada empresa le pertenecen. VORDIA los trata como encargado, solo para prestar el servicio y según la{" "}
          <a href="/privacidad" className="text-[#5eb0ff] hover:underline">
            Política de Privacidad
          </a>
          . Al terminar la relación, el cliente puede pedir una exportación de sus datos dentro de los 30 días siguientes; luego se eliminan, salvo lo
          que la ley obligue a conservar.
        </p>
      </section>

      <section>
        <h2>6. Precios, facturación y pagos</h2>
        <p>
          Los precios son los de la propuesta o pedido aceptado. Emitimos factura conforme a la normativa tributaria vigente. La falta de pago puede dar
          lugar, previo aviso, a la suspensión del servicio hasta su regularización. Los cambios de precio se avisan con al menos 30 días de anticipación.
        </p>
      </section>

      <section>
        <h2>7. Disponibilidad y soporte</h2>
        <p>
          Trabajamos para mantener el servicio disponible de forma continua y hacemos copias de seguridad periódicas. Puede haber interrupciones por
          mantenimiento, que procuramos avisar con antelación. Los niveles de servicio específicos, si los hay, constan en el contrato del cliente.
        </p>
      </section>

      <section>
        <h2>8. Propiedad intelectual</h2>
        <p>
          El software, la marca VORDIA y los contenidos del sitio pertenecen a VORDIA. La suscripción otorga un derecho de uso no exclusivo e
          intransferible mientras esté vigente; no implica cesión de derechos sobre el software.
        </p>
      </section>

      <section>
        <h2>9. Responsabilidad</h2>
        <p>
          VORDIA responde por la prestación diligente del servicio. No responde por daños derivados de un uso contrario a estas condiciones, de datos
          cargados de forma incorrecta por el cliente o de causas ajenas a su control. Salvo dolo o culpa grave, la responsabilidad total de VORDIA se
          limita a lo pagado por el cliente en los 12 meses anteriores al hecho. Nada de esto limita los derechos irrenunciables del consumidor.
        </p>
      </section>

      <section>
        <h2>10. Contratación electrónica</h2>
        <p>
          Las propuestas y pedidos aceptados por medios electrónicos (por ejemplo, desde el link de un pedido) tienen la misma validez que un contrato
          escrito. Guardamos constancia de la aceptación con su fecha y los datos de quien aceptó.
        </p>
      </section>

      <section>
        <h2>11. Baja del servicio</h2>
        <p>
          El cliente puede dar de baja la suscripción con el preaviso que fije su contrato (o, si no lo fija, 30 días). Las sumas ya facturadas por
          períodos en curso no son reembolsables, salvo que la ley disponga otra cosa.
        </p>
      </section>

      <section>
        <h2>12. Ley aplicable</h2>
        <p>
          Estas condiciones se rigen por las leyes de la República del Paraguay. Ante cualquier diferencia buscaremos primero una solución amistosa; si
          no fuera posible, serán competentes los tribunales de la ciudad de Asunción.
        </p>
      </section>
    </DocumentoLegal>
  );
}

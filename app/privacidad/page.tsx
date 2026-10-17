import type { Metadata } from "next";
import { CanalContacto, DocumentoLegal } from "../web-institucional/DocumentoLegal";
import { identificacionVordia } from "@/lib/vordiaLegal";

export const metadata: Metadata = {
  title: "Política de Privacidad | VORDIA",
  description: "Cómo VORDIA recoge, usa y protege los datos personales en su sitio y en sus plataformas de gestión.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <DocumentoLegal
      titulo="Política de Privacidad"
      intro="En VORDIA tratamos los datos personales con transparencia, solo para fines concretos y con medidas de seguridad acordes. Esta política explica qué datos usamos, para qué, con quién los compartimos y cómo podés ejercer tus derechos."
    >
      <section>
        <h2>1. Responsable</h2>
        <p>
          El responsable del tratamiento de los datos recogidos en este sitio es {identificacionVordia()} (en adelante, “VORDIA”). Para cualquier
          consulta sobre privacidad podés escribirnos por <CanalContacto />.
        </p>
      </section>

      <section>
        <h2>2. Marco legal</h2>
        <p>
          Aplicamos los derechos de intimidad y de acceso a la información personal reconocidos por la Constitución Nacional (artículos 33 y 135), la
          Ley N° 4868/2013 de Comercio Electrónico y su Decreto reglamentario N° 1165/2014, la Ley N° 1334/1998 de Defensa del Consumidor y, como estándar de
          referencia, la Ley N° 7593/2025 de Protección de Datos Personales, cuyos principios adoptamos desde ya.
        </p>
      </section>

      <section>
        <h2>3. Qué datos recogemos y para qué</h2>
        <ul>
          <li>
            <strong>Solicitudes de demostración y contacto:</strong> nombre, cargo, empresa, ciudad, correo, teléfono y la necesidad que nos contás. Los
            usamos para responderte y preparar una propuesta. Base: tu consentimiento al enviar el formulario.
          </li>
          <li>
            <strong>Cuentas de usuario de las plataformas:</strong> nombre, correo corporativo, rol y registros de acceso. Los usamos para darte acceso
            seguro y prevenir usos indebidos. Base: la relación contractual con tu empresa.
          </li>
          <li>
            <strong>Prospección comercial:</strong> datos de contacto institucional que organismos y empresas publican en pedidos o llamados públicos.
            Los usamos únicamente para ofrecer una solución relacionada con ese pedido; cada mensaje identifica a VORDIA e incluye una forma simple de
            darse de baja.
          </li>
          <li>
            <strong>Datos técnicos:</strong> dirección IP y datos de navegación necesarios para la seguridad y el funcionamiento del servicio.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Datos que cargan nuestros clientes</h2>
        <p>
          Cuando una empresa usa una plataforma VORDIA (por ejemplo, para administrar residentes, huéspedes, clientes, empleados o ganado), esa empresa es la
          responsable de esos datos y VORDIA actúa como encargado del tratamiento: los procesa solo para prestar el servicio, siguiendo sus
          instrucciones, sin venderlos ni usarlos con fines propios, y los devuelve o elimina al terminar el contrato.
        </p>
      </section>

      <section>
        <h2>5. Con quién compartimos datos</h2>
        <p>
          No vendemos datos personales. Solo los compartimos con proveedores que necesitamos para operar (alojamiento e infraestructura, envío de correos,
          facturación electrónica y medios de pago), bajo deber de confidencialidad, y con autoridades cuando una ley lo exija. Algunos de estos proveedores
          pueden estar fuera de Paraguay; en ese caso exigimos un nivel de protección equivalente.
        </p>
      </section>

      <section>
        <h2>6. Cookies y almacenamiento local</h2>
        <p>
          Este sitio no usa cookies de publicidad ni de seguimiento de terceros. Las plataformas usan almacenamiento local del navegador solo para mantener
          tu sesión y tus preferencias, algo necesario para que el servicio funcione.
        </p>
      </section>

      <section>
        <h2>7. Cuánto tiempo los guardamos</h2>
        <p>
          Las solicitudes de contacto, hasta 24 meses desde el último intercambio. Los datos de las cuentas, mientras dure el contrato y luego el tiempo que
          exijan las normas tributarias y contables. Las bajas de comunicaciones comerciales se conservan para no volver a escribirte.
        </p>
      </section>

      <section>
        <h2>8. Seguridad</h2>
        <p>
          Usamos conexiones cifradas (HTTPS), contraseñas protegidas con algoritmos de hash, accesos por rol, separación de datos entre empresas y
          registros de actividad. Si ocurriera un incidente que afecte tus datos, lo comunicaremos a los afectados y a la autoridad competente según
          corresponda.
        </p>
      </section>

      <section>
        <h2>9. Tus derechos</h2>
        <p>
          Podés pedir acceso, rectificación, actualización, supresión u oposición al uso de tus datos, y la portabilidad de los datos que nos diste,
          escribiendo por <CanalContacto />. Respondemos en un plazo máximo de 10 días hábiles. Si tus datos los cargó una empresa cliente, te ayudaremos
          a canalizar el pedido con ella. También podés recurrir a la acción de hábeas data ante la justicia.
        </p>
      </section>

      <section>
        <h2>10. Menores de edad</h2>
        <p>Nuestros servicios están dirigidos a empresas. No recogemos a sabiendas datos de menores de 18 años a través de este sitio.</p>
      </section>

      <section>
        <h2>11. Cambios</h2>
        <p>Si modificamos esta política publicaremos la nueva versión en esta página con su fecha de actualización.</p>
      </section>
    </DocumentoLegal>
  );
}

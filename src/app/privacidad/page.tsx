import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad | Trentz CRM",
};

// Pagina publica requerida por Meta para publicar la app de WhatsApp.

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">
        Política de privacidad
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Trentz CRM · Última actualización: julio de 2026
      </p>

      <div className="mt-8 grid gap-6 text-sm leading-7 text-zinc-700">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-zinc-950">
            1. Quiénes somos
          </h2>
          <p>
            Trentz CRM es la plataforma interna de gestión de clientes de
            Trentz. Esta política describe cómo tratamos la información
            personal que recibimos a través de nuestros canales de contacto,
            incluyendo WhatsApp, correo electrónico y formularios en línea.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-zinc-950">
            2. Información que recopilamos
          </h2>
          <p>
            Recopilamos los datos de contacto que nos proporcionas directamente
            (nombre, teléfono, correo electrónico, empresa) y el contenido de
            las conversaciones que mantienes con nosotros por WhatsApp u otros
            canales, con el fin de darte seguimiento comercial y de servicio.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-zinc-950">
            3. Uso de la información
          </h2>
          <p>
            Usamos tu información únicamente para: responder tus mensajes y
            solicitudes, dar seguimiento a proyectos y pagos contratados,
            enviarte información que nos solicites y mejorar nuestra atención.
            No vendemos ni compartimos tus datos con terceros con fines de
            mercadotecnia.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-zinc-950">
            4. WhatsApp Business
          </h2>
          <p>
            Utilizamos la plataforma de WhatsApp Business (Meta) para
            comunicarnos contigo. Los mensajes que intercambiamos se almacenan
            de forma segura en nuestros sistemas para mantener el historial de
            atención. El tratamiento de datos por parte de Meta se rige por su
            propia política de privacidad.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-zinc-950">
            5. Conservación y seguridad
          </h2>
          <p>
            Conservamos tu información mientras exista una relación comercial o
            de prospección activa. Aplicamos medidas técnicas y organizativas
            razonables para protegerla contra acceso no autorizado.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-zinc-950">
            6. Tus derechos
          </h2>
          <p>
            Puedes solicitar en cualquier momento el acceso, rectificación o
            eliminación de tus datos personales escribiéndonos a{" "}
            <a
              href="mailto:hugo@trentz.com.mx"
              className="font-medium text-zinc-950 underline underline-offset-2"
            >
              hugo@trentz.com.mx
            </a>
            . Atenderemos tu solicitud en un plazo máximo de 20 días hábiles.
          </p>
        </section>
      </div>
    </main>
  );
}

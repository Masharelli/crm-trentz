"use client";

import { CheckCircle2, Copy, MessageCircle, TriangleAlert } from "lucide-react";
import Script from "next/script";
import { useCallback, useEffect, useState } from "react";

// Flujo oficial de Embedded Signup de Meta para conectar un numero que ya
// vive en la app de WhatsApp Business (coexistencia). El evento postMessage
// WA_EMBEDDED_SIGNUP regresa el phone_number_id y waba_id al terminar.

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (
        cb: (response: unknown) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type SignupResult = {
  phoneNumberId?: string;
  wabaId?: string;
  currentStep?: string;
  event?: string;
};

export default function ConnectWhatsApp({
  appId,
  configId,
}: {
  appId: string;
  configId: string;
}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [result, setResult] = useState<SignupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v23.0",
      });
      setSdkReady(true);
    };

    function onMessage(event: MessageEvent) {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      try {
        const data = JSON.parse(event.data as string);
        if (data.type !== "WA_EMBEDDED_SIGNUP") return;

        if (data.event === "FINISH" || data.event === "FINISH_ONLY_WABA") {
          setResult({
            phoneNumberId: data.data?.phone_number_id,
            wabaId: data.data?.waba_id,
            event: data.event,
          });
          setError(null);
        } else if (data.event === "CANCEL") {
          setResult(null);
          setError(
            data.data?.current_step
              ? `El flujo se cancelo en el paso: ${data.data.current_step}`
              : "El flujo se cancelo antes de terminar.",
          );
        }
      } catch {
        // mensajes que no son JSON: ignorar
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [appId]);

  const launch = useCallback(() => {
    setError(null);
    window.FB?.login(
      (response) => {
        // El codigo de respuesta no se usa: los activos quedan en tu
        // portafolio y el CRM usa el token del usuario del sistema.
        void response;
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      },
    );
  }, [configId]);

  async function copyPhoneNumberId() {
    if (!result?.phoneNumberId) return;
    await navigator.clipboard.writeText(result.phoneNumberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const missingConfig = !appId || !configId;

  return (
    <>
      <Script
        src="https://connect.facebook.net/es_LA/sdk.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />

      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
          Conectar WhatsApp
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Vincula tu numero de la app WhatsApp Business con la API (coexistencia)
        </p>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          {missingConfig ? (
            <div className="flex items-start gap-3 rounded-md bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              <p>
                Faltan las variables <code>NEXT_PUBLIC_META_APP_ID</code> y{" "}
                <code>NEXT_PUBLIC_META_LOGIN_CONFIG_ID</code> en el entorno.
                Agregalas en Vercel y vuelve a deployar.
              </p>
            </div>
          ) : result ? (
            <div className="grid gap-4">
              <div className="flex items-start gap-3 rounded-md bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <p>
                  Numero conectado correctamente. Copia el identificador y
                  agregalo en Vercel como{" "}
                  <code className="font-semibold">WHATSAPP_PHONE_NUMBER_ID</code>
                  , luego haz redeploy.
                </p>
              </div>

              {result.phoneNumberId ? (
                <div className="grid gap-1.5 text-sm">
                  <span className="font-medium text-zinc-700">
                    Identificador del numero (Phone Number ID)
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-950">
                      {result.phoneNumberId}
                    </code>
                    <button
                      type="button"
                      onClick={copyPhoneNumberId}
                      className="inline-flex h-11 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                    >
                      <Copy size={14} />
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-600">
                  El flujo termino pero no regreso el identificador del numero
                  (evento: {result.event}). Buscalo en el panel de Meta en
                  WhatsApp → Configuracion de la API, en el selector de numeros.
                </p>
              )}

              {result.wabaId ? (
                <div className="grid gap-1.5 text-sm">
                  <span className="font-medium text-zinc-700">
                    Cuenta de WhatsApp Business (WABA ID)
                  </span>
                  <code className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-950">
                    {result.wabaId}
                  </code>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="grid gap-2 text-sm text-zinc-600">
                <p className="font-medium text-zinc-950">Antes de empezar:</p>
                <ul className="grid list-disc gap-1 pl-5">
                  <li>
                    Ten a la mano el celular con la app{" "}
                    <strong>WhatsApp Business</strong> actualizada (el flujo te
                    pedira escanear un QR).
                  </li>
                  <li>
                    Elige la opcion de{" "}
                    <strong>conectar tu numero existente de la app</strong>{" "}
                    cuando el flujo lo pregunte — asi conservas la app del
                    celular funcionando.
                  </li>
                  <li>
                    Acepta compartir el historial para que tus chats recientes
                    aparezcan en el CRM.
                  </li>
                </ul>
              </div>

              {error ? (
                <div className="flex items-start gap-3 rounded-md bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
                  <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={launch}
                disabled={!sdkReady}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageCircle size={17} />
                {sdkReady ? "Conectar mi numero de WhatsApp" : "Cargando SDK de Meta..."}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

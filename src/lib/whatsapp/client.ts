// Cliente de la Graph API de Meta para WhatsApp Cloud API.
// Cumple el mismo rol que src/lib/resend.ts para correos.

const GRAPH_URL = "https://graph.facebook.com/v23.0";

function getConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "Faltan WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env.local",
    );
  }

  return { accessToken, phoneNumberId };
}

export type SendResult =
  | { wamid: string; error?: undefined }
  | { wamid?: undefined; error: string };

export async function sendTextMessage(
  to: string,
  body: string,
): Promise<SendResult> {
  const { accessToken, phoneNumberId } = getConfig();

  try {
    const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: json?.error?.message ?? `Graph API ${res.status}` };
    }

    const wamid = json?.messages?.[0]?.id;
    if (!wamid) return { error: "Respuesta de Meta sin id de mensaje" };

    return { wamid };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de red" };
  }
}

// La URL que regresa Meta expira en ~5 minutos: obtener y descargar
// siempre en una sola pasada.
export async function fetchMediaUrl(
  mediaId: string,
): Promise<{ url: string; mimeType: string } | null> {
  const { accessToken } = getConfig();

  const res = await fetch(`${GRAPH_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;

  const json = await res.json();
  if (!json?.url) return null;

  return { url: json.url, mimeType: json.mime_type ?? "application/octet-stream" };
}

export async function downloadMedia(url: string): Promise<ArrayBuffer | null> {
  const { accessToken } = getConfig();

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;

  return res.arrayBuffer();
}

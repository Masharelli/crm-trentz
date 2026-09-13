// Cliente de la Graph API de Meta para WhatsApp Cloud API.
// Cumple el mismo rol que src/lib/resend.ts para correos.

function graphUrl(path: string) {
  const version = process.env.META_GRAPH_API_VERSION ?? "v23.0";
  return `https://graph.facebook.com/${version}/${path}`;
}

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
    const res = await fetch(graphUrl(`${phoneNumberId}/messages`), {
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

export type WhatsAppTemplate = {
  name: string;
  language: string;
  category: string;
  body: string;
  variableCount: number;
};

type MetaTemplateComponent = {
  type?: string;
  format?: string;
  text?: string;
  buttons?: Array<{ url?: string; text?: string }>;
};

function countVariables(value: string): number {
  const indexes = [...value.matchAll(/\{\{(\d+)\}\}/g)].map((match) =>
    Number(match[1]),
  );
  return indexes.length > 0 ? Math.max(...indexes) : 0;
}

export async function listApprovedTemplates(): Promise<WhatsAppTemplate[]> {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!wabaId) return [];

  try {
    const { accessToken } = getConfig();
    const fields = "name,language,category,status,components";
    const res = await fetch(
      `${graphUrl(`${wabaId}/message_templates`)}?status=APPROVED&limit=100&fields=${encodeURIComponent(fields)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return [];

    const json = (await res.json()) as {
      data?: Array<{
        name?: string;
        language?: string;
        category?: string;
        status?: string;
        components?: MetaTemplateComponent[];
      }>;
    };

    return (json.data ?? []).flatMap((template) => {
      const components = template.components ?? [];
      const body = components.find((component) => component.type === "BODY")?.text;
      const bodyPlaceholders = [
        ...(body ?? "").matchAll(/\{\{([^}]+)\}\}/g),
      ];
      const unsupportedVariables = components
        .filter((component) => component.type !== "BODY")
        .some(
          (component) =>
            countVariables(component.text ?? "") > 0 ||
            (component.buttons ?? []).some(
              (button) => countVariables(button.url ?? "") > 0,
            ),
        );
      const requiresMediaHeader = components.some(
        (component) =>
          component.type === "HEADER" &&
          component.format !== undefined &&
          component.format !== "TEXT",
      );
      const hasNamedVariables = bodyPlaceholders.some(
        (match) => !/^\d+$/.test(match[1]),
      );

      if (
        template.status !== "APPROVED" ||
        !template.name ||
        !template.language ||
        !body ||
        unsupportedVariables ||
        requiresMediaHeader ||
        hasNamedVariables
      ) {
        return [];
      }

      return [
        {
          name: template.name,
          language: template.language,
          category: template.category ?? "UTILITY",
          body,
          variableCount: countVariables(body),
        },
      ];
    });
  } catch {
    return [];
  }
}

export async function sendTemplateMessage(
  to: string,
  template: WhatsAppTemplate,
  variables: string[],
): Promise<SendResult> {
  const { accessToken, phoneNumberId } = getConfig();
  const components =
    variables.length > 0
      ? [
          {
            type: "body",
            parameters: variables.map((text) => ({ type: "text", text })),
          },
        ]
      : undefined;

  try {
    const res = await fetch(graphUrl(`${phoneNumberId}/messages`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          ...(components ? { components } : {}),
        },
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { error: json?.error?.message ?? `Graph API ${res.status}` };
    }

    const wamid = json?.messages?.[0]?.id;
    return wamid
      ? { wamid }
      : { error: "Respuesta de Meta sin id de mensaje" };
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

  const res = await fetch(graphUrl(mediaId), {
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

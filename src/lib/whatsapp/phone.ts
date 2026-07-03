// Normalizacion de telefonos para matchear numeros de WhatsApp contra
// los telefonos guardados en clientes/contactos. Los formatos varian
// ("55 1234 5678", "+52 55...", wa_id "5215512345678" con el 1 extra
// mexicano), asi que se comparan solo los ultimos 10 digitos.

export function last10Digits(input: string): string {
  return input.replace(/\D/g, "").slice(-10);
}

export function formatWaId(waId: string): string {
  const digits = waId.replace(/\D/g, "");
  return `+${digits}`;
}

// Ventana de servicio de Meta: solo se pueden mandar mensajes libres dentro
// de las 24h posteriores al ultimo mensaje del cliente.
export const WINDOW_MS = 24 * 60 * 60 * 1000;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL } from "@/lib/resend";

export const dynamic = "force-dynamic";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function buildHtml(
  clientName: string,
  concept: string,
  amount: number,
  currency: string,
  dueDate: string,
  daysLeft: number,
): string {
  const formattedAmount = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(amount);

  const daysText = daysLeft === 1 ? "mañana" : `en ${daysLeft} días`;
  const dueDateFormatted = new Date(dueDate + "T12:00:00Z").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#09090b;padding:24px 32px;">
      <p style="margin:0;font-size:18px;font-weight:600;color:#fff;letter-spacing:-0.01em;">Trentz CRM</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#09090b;">Recordatorio de pago</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#71717a;">Vence ${daysText} &middot; ${dueDateFormatted}</p>
      <table style="width:100%;border-collapse:collapse;background:#f4f4f5;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px;font-size:13px;color:#71717a;width:40%;">Cliente</td>
          <td style="padding:16px 20px;font-size:14px;font-weight:500;color:#09090b;">${clientName}</td>
        </tr>
        <tr style="border-top:1px solid #e4e4e7;">
          <td style="padding:16px 20px;font-size:13px;color:#71717a;">Concepto</td>
          <td style="padding:16px 20px;font-size:14px;font-weight:500;color:#09090b;">${concept}</td>
        </tr>
        <tr style="border-top:1px solid #e4e4e7;">
          <td style="padding:16px 20px;font-size:13px;color:#71717a;">Monto</td>
          <td style="padding:16px 20px;font-size:16px;font-weight:700;color:#09090b;">${formattedAmount}</td>
        </tr>
      </table>
    </div>
    <div style="padding:20px 32px;background:#f4f4f5;border-top:1px solid #e4e4e7;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;">Enviado desde Trentz CRM &middot; ${FROM_EMAIL}</p>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const today = new Date().toISOString().split("T")[0];
  const maxFuture = addDays(today, 90);

  const { data: payments, error: fetchError } = await supabase
    .from("payments")
    .select(
      "id, client_id, concept, amount, currency, due_date, reminder_days_before, last_reminder_sent_at, clients!inner(display_name, primary_email)",
    )
    .in("status", ["pending", "scheduled"])
    .gte("due_date", today)
    .lte("due_date", maxFuture)
    .not("clients.primary_email", "is", null);

  if (fetchError) {
    console.error("[cron/recordatorios] fetch error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const results = { sent: 0, skipped: 0, errors: 0 };

  for (const payment of payments ?? []) {
    const targetDate = addDays(today, payment.reminder_days_before);
    if (payment.due_date !== targetDate) continue;

    if (payment.last_reminder_sent_at) {
      const lastDate = (payment.last_reminder_sent_at as string).split("T")[0];
      if (lastDate === today) {
        results.skipped++;
        continue;
      }
    }

    const client = payment.clients as unknown as { display_name: string; primary_email: string };
    const daysLeft = payment.reminder_days_before;
    const subject = `Recordatorio: pago vence ${daysLeft === 1 ? "mañana" : `en ${daysLeft} días`}`;
    const html = buildHtml(
      client.display_name,
      payment.concept,
      payment.amount,
      payment.currency,
      payment.due_date,
      daysLeft,
    );

    const to = [client.primary_email];
    if (adminEmail && adminEmail !== client.primary_email) to.push(adminEmail);

    const { error: sendError } = await resend.emails.send({
      from: `Trentz CRM <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    if (sendError) {
      console.error(`[cron/recordatorios] send error for payment ${payment.id}:`, sendError);
      results.errors++;
      continue;
    }

    await Promise.all([
      supabase
        .from("payments")
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq("id", payment.id),
      supabase.from("email_notifications").insert({
        client_id: payment.client_id,
        payment_id: payment.id,
        recipient_email: client.primary_email,
        subject,
        status: "sent",
        sent_at: new Date().toISOString(),
      }),
    ]);

    results.sent++;
  }

  return NextResponse.json({ ok: true, today, ...results });
}

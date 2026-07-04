import { redirect } from "next/navigation";
import { getCurrentRole, isAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import ConnectWhatsApp from "./ConnectWhatsApp";

export default async function ConectarWhatsAppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  if (!isAdmin(role)) redirect("/whatsapp");

  return (
    <ConnectWhatsApp
      appId={process.env.NEXT_PUBLIC_META_APP_ID ?? ""}
      configId={process.env.NEXT_PUBLIC_META_LOGIN_CONFIG_ID ?? ""}
    />
  );
}

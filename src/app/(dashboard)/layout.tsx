import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import Toast from "./components/Toast";
import Sidebar from "./Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { items: notifications, count: notificationsCount } =
    await getNotifications(supabase);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        notifications={notifications}
        notificationsCount={notificationsCount}
      />

      <section className="flex min-w-0 flex-1 flex-col">{children}</section>

      <Suspense>
        <Toast />
      </Suspense>
    </div>
  );
}

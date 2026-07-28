import { Sidebar }            from "@/components/layout/sidebar";
import { Topbar }             from "@/components/layout/topbar";
import { createClient }       from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";
import { UserContextProvider } from "@/lib/context/user-context";
import { redirect }           from "next/navigation";

const HQ_ROLES = ["franchisor_admin", "hq_manager", "regional_manager"];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Read JWT custom claims (injected by set_custom_claims hook)
  const { data: { session } } = await supabase.auth.getSession();
  let tenantId = "";
  let outletId = "";   // empty string for HQ users — intentional
  let role     = "outlet_manager";
  let claimsOk = false;

  if (session?.access_token) {
    try {
      const parts   = session.access_token.split(".");
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString()
      ) as Record<string, string | null>;
      tenantId = payload["tenant_id"] ?? "";
      outletId = payload["outlet_id"] ?? "";   // null → "" for HQ
      role     = payload["role"]      ?? "outlet_manager";
      claimsOk = !!tenantId;
    } catch {
      // Claims not yet present — fall through to DB lookup
    }
  }

  // Fallback: read from DB if JWT claims aren't populated yet
  const admin = createAdminClient();

  if (!claimsOk) {
    const { data: membership } = await admin
      .from("memberships")
      .select("tenant_id, outlet_id, roles(name)")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .single();
    tenantId = membership?.tenant_id ?? "";
    outletId = membership?.outlet_id ?? "";
    role     = (membership?.roles as { name: string } | null)?.name ?? "outlet_manager";
  }

  const isHq = HQ_ROLES.includes(role);

  // Display info
  const [profileRes, outletRes] = await Promise.all([
    admin.from("users").select("full_name").eq("id", user.id).single(),
    outletId
      ? admin.from("outlets").select("name").eq("id", outletId).single()
      : Promise.resolve({ data: null }),
  ]);

  const outletName =
    isHq
      ? "Pure Eight HQ"
      : (outletRes.data as { name: string } | null)?.name ?? "Pure Eight";

  const userName =
    (profileRes.data as { full_name: string } | null)?.full_name ??
    user.email?.split("@")[0] ??
    "User";

  return (
    <UserContextProvider
      value={{ userId: user.id, tenantId, outletId, role, isHqUser: isHq, outletName, userName }}
    >
      <div className="flex h-screen overflow-hidden bg-offwhite">
        <Sidebar role={role} outletName={outletName} brandName="Pure Eight" />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar userName={userName} userRole={role} outletName={outletName} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    </UserContextProvider>
  );
}

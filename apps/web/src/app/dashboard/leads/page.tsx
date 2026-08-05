import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { LeadsKanban } from "./leads-kanban";
import { AddLeadModal } from "./add-lead-modal";
import { getStaffList } from "./actions";
import { getServerContext } from "@/lib/context/server";
import { redirect } from "next/navigation";

async function getLeads(outletId: string | null) {
  const supabase = createAdminClient();
  let query = supabase
    .from("leads")
    .select("id,full_name,mobile,source,expected_service,status,follow_up_at,staff:assigned_staff_id(id,full_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  // HQ users have no outlet — show the whole network rather than filtering by ''.
  if (outletId) query = query.eq("outlet_id", outletId);
  const { data } = await query;

  return (data ?? []).map(lead => ({
    ...lead,
    staff: lead.staff as unknown as { id: string; full_name: string } | null,
  }))
}

export default async function LeadsPage() {
  const ctx = await getServerContext();
  if (!ctx) redirect('/auth/login');
  const { outletId } = ctx;

  const [leads, staff] = await Promise.all([getLeads(outletId), getStaffList()])
  const activeCount = leads.filter(l => l.status !== 'converted').length

  return (
    <div>
      <PageHeader
        title="Lead Management"
        subtitle={`${activeCount} active leads`}
        actions={
          <AddLeadModal
            staff={staff}
            trigger={
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />Add Lead
              </Button>
            }
          />
        }
      />
      <LeadsKanban initialLeads={leads} staffList={staff} />
    </div>
  )
}

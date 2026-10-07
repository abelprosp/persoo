import { workspaceAccess } from "@/lib/access";
import { ProposalPanel } from "./proposal-panel";

export default async function ProposalsPage() {
  const { db, workspace } = await workspaceAccess();
  const [{ data: deals }, { data: proposals }] = await Promise.all([
    db.from("deals").select("id,title,value").eq("workspace_id", workspace.id).eq("active", true).order("updated_at", { ascending: false }).limit(200),
    db.from("sales_proposals").select("id,deal_id,version,status,valid_until,total,created_at,deals(title)").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(100),
  ]);
  return <ProposalPanel deals={deals ?? []} proposals={proposals ?? []} />;
}

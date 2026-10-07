import { workspaceAccess } from "@/lib/access";
import { PipelinePanel } from "./pipeline-panel";
export default async function PipelinesPage() { const { workspace } = await workspaceAccess(true); return <PipelinePanel workspaceId={workspace.id} />; }

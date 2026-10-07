import { workspaceAccess } from "@/lib/access";
import { ImportPanel } from "./panel";
export default async function ImportPage(){await workspaceAccess(true);return <ImportPanel/>;}

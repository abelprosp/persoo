import {workspaceAccess} from "@/lib/access";
import {AutomationsPanel} from "./panel";
export default async function Page(){await workspaceAccess(true);return <AutomationsPanel/>;}

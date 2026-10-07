import {workspaceAccess} from "@/lib/access";
import {WhatsAppPanel} from "./panel";
export default async function WhatsAppPage(){await workspaceAccess(true);return <WhatsAppPanel/>;}

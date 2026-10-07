import {workspaceAccess} from "@/lib/access";
import {SearchPanel} from "./panel";
import {searchSchema} from "@/lib/crm-search";
export default async function SearchPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){await workspaceAccess();return <SearchPanel initial={searchSchema.parse(await searchParams)}/>;}

import {z} from "zod";
export const entityLabels={all:"Todos",leads:"Leads",deals:"Negócios",contacts:"Contatos",organizations:"Organizações",tasks:"Tarefas",products:"Produtos",notes:"Notas"};
export const searchSchema=z.object({
 q:z.string().trim().max(120).default(""),entity:z.enum(["all","leads","deals","contacts","organizations","tasks","products","notes"]).default("all"),
 active:z.enum(["true","false","all"]).default("true"),owner:z.string().trim().max(200).default(""),
 status:z.string().trim().max(80).default(""),stale:z.enum(["0","7","14","30"]).default("0"),
 due:z.enum(["any","overdue","today"]).default("any"),page:z.coerce.number().int().min(1).max(10000).default(1),
});
export type SearchFilters=z.infer<typeof searchSchema>;
export const defaultFilters:SearchFilters=searchSchema.parse({});
export type SearchResult={id:string;entity:Exclude<SearchFilters["entity"],"all">;title:string;email:string|null;phone:string|null;owner:string|null;status:string|null;updated_at:string;detail:Record<string,unknown>};

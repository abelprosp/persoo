import { z } from "zod";

export const importRowSchema = z.object({
  full_name: z.string().trim().min(1,"Nome obrigatório").max(200),
  email: z.union([z.email().max(254),z.literal("")]).transform(v=>v.toLowerCase()),
  phone: z.string().max(40).transform(v=>v.replace(/\D/g,""))
    .refine(v=>!v || /^\d{8,15}$/.test(v),"Telefone deve ter de 8 a 15 dígitos; inclua o código do país"),
  company: z.string().trim().max(200).default(""),
}).refine(v=>Boolean(v.email||v.phone),"Informe e-mail ou telefone para identificar duplicados");
export type ImportRow = z.infer<typeof importRowSchema>;
export const importFields = ["full_name","email","phone","company"] as const;
export function parseCsv(input: string): string[][] {
  const source=input.replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  const first=source.split("\n")[0] ?? "";
  const delimiter=first.split(";").length>first.split(",").length?";":",";
  const rows:string[][]=[];let row:string[]=[];let cell="";let quoted=false;let closed=false;
  function pushCell(){if(cell.length>4000)throw Error("Uma célula excede 4.000 caracteres.");row.push(cell);cell="";closed=false;if(row.length>80)throw Error("Máximo de 80 colunas.");}
  function pushRow(){pushCell();if(row.some(v=>v.trim()))rows.push(row);row=[];if(rows.length>1001)throw Error("Importe no máximo 1.000 registros por arquivo.");}
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(quoted){if(c==='"'){if(source[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
    else if(c===delimiter)pushCell();
    else if(c==="\n")pushRow();
    else if(c==='"' && cell==="" && !closed)quoted=true;
    else {if(closed && c.trim())throw Error("CSV inválido após aspas.");if(!closed)cell+=c;}
    if(cell.length>4000)throw Error("Uma célula excede 4.000 caracteres.");
  }
  if(quoted)throw Error("CSV com aspas não fechadas.");
  if(cell || row.length)pushRow();
  if(rows.length<2)throw Error("O arquivo precisa de cabeçalho e pelo menos um registro.");
  if(rows.some(r=>r.length!==rows[0].length))throw Error("As linhas precisam ter a mesma quantidade de colunas.");
  return rows;
}
export function normalizeMappedRows(rows:string[][],mapping:Record<string,number>) {
  return rows.map((row,index)=>{
    const values=Object.fromEntries(importFields.map(field=>[field,mapping[field]>=0?row[mapping[field]]?.trim() ?? "":""]));
    const result=importRowSchema.safeParse(values);
    return result.success?{line:index+2,data:result.data,error:null}:{line:index+2,data:null,error:result.error.issues.map(i=>i.message).join("; ")};
  });
}

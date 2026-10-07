import Link from "next/link";
type Props={total:number;pageSize?:number;page?:number;params?:Record<string,string|string[]|undefined>};
export function DataTableFooter({total,pageSize=20,page=1,params={}}:Props) {
 function href(p:number,size=pageSize){const query=new URLSearchParams();for(const [k,v] of Object.entries(params))if(typeof v==="string")query.set(k,v);query.set("page",String(p));query.set("size",String(size));return `?${query}`;}
 const pages=Math.max(1,Math.ceil(total/pageSize));
 return <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm"><div className="flex items-center gap-2"><span>Por página</span>{[20,50,100].map(n=><Link key={n} href={href(1,n)} aria-current={n===pageSize?"page":undefined} className={`rounded-md px-3 py-2 ${n===pageSize?"bg-violet-50 font-semibold text-violet-700":"hover:bg-muted"}`}>{n}</Link>)}</div><p>{total===0?0:Math.min(total,(page-1)*pageSize+1)}–{Math.min(total,page*pageSize)} de {total}</p><div className="flex gap-3">{page>1&&<Link className="rounded border px-3 py-2" href={href(page-1)}>Anterior</Link>}<span className="py-2">Página {page} de {pages}</span>{page<pages&&<Link className="rounded border px-3 py-2" href={href(page+1)}>Próxima</Link>}</div></nav>;
}

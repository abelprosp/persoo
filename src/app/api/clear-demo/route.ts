import { workspaceAccess } from "@/lib/access";
import { transaction } from "@/lib/db/pool";
import { NextResponse } from "next/server";
export async function POST() {
  try {
    const { user,workspace } = await workspaceAccess(true);
    const count = await transaction(user.id,async run => {
      let total=0;
      for (const table of ["tasks","notes","deals","leads","contacts","organizations"]) {
        const result=await run(`UPDATE ${table} SET active=false,updated_at=now() WHERE workspace_id=$1 AND is_demo=true AND active=true`,[workspace.id]);
        total+=result.rowCount ?? 0;
      }
      return total;
    });
    return NextResponse.json({ok:true,message:`${count} registros de demonstração arquivados. Dados reais preservados.`});
  } catch(error) { return NextResponse.json({error:error instanceof Error ? error.message : "Não foi possível arquivar a demonstração."},{status:400}); }
}

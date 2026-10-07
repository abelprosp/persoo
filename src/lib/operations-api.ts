import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class InputError extends Error {}
export function operationError(error:unknown) {
  if(error instanceof InputError || error instanceof ZodError) return NextResponse.json({error:error instanceof InputError?error.message:"Revise os campos informados."},{status:400});
  console.error("CRM operation failed", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({error:"Não foi possível concluir. Verifique seu acesso e tente novamente."},{status:403});
}

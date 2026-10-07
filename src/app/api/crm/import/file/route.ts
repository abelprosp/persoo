import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { workspaceAccess } from "@/lib/access";
import { readBody,rateLimit } from "@/lib/security";
import { parseCsv } from "@/lib/crm-import";
import { InputError,operationError } from "@/lib/operations-api";

function checkArchive(buffer:Buffer) {
 let end=-1;
 for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0)throw new InputError("Arquivo Excel inválido.");
 const count=buffer.readUInt16LE(end+10);let offset=buffer.readUInt32LE(end+16);let total=0;
 if(count>2000 || count===65535)throw new InputError("Planilha muito complexa.");
 for(let i=0;i<count;i++){
  if(offset+46>buffer.length || buffer.readUInt32LE(offset)!==0x02014b50)throw new InputError("Arquivo Excel inválido.");
  total+=buffer.readUInt32LE(offset+24);
  if(total>20*1024*1024)throw new InputError("Planilha descompactada excede 20 MB.");
  offset+=46+buffer.readUInt16LE(offset+28)+buffer.readUInt16LE(offset+30)+buffer.readUInt16LE(offset+32);
 }
}
export async function POST(request:Request) {
 try{
  const {user}=await workspaceAccess(true);
  if(!await rateLimit("upload:"+user.id,20,3600))throw new InputError("Muitos arquivos. Tente mais tarde.");
  const kind=new URL(request.url).searchParams.get("type");
  const bytes=await readBody(request,2*1024*1024);
  let rows:string[][];
  if(kind==="xlsx"){
   checkArchive(bytes);const book=new ExcelJS.Workbook();
   await book.xlsx.load(bytes as unknown as Parameters<typeof book.xlsx.load>[0]);
   const sheet=book.worksheets[0];
   if(!sheet || sheet.rowCount>1001 || sheet.columnCount>80)throw new InputError("Use até 1.000 registros e 80 colunas na primeira aba.");
   rows=[];sheet.eachRow(row=>{const values:string[]=[];for(let col=1;col<=sheet.columnCount;col++){const cell=row.getCell(col);if(cell.type===ExcelJS.ValueType.Formula)throw new InputError("Substitua as fórmulas por valores antes de importar.");const text=cell.text;if(text.length>4000)throw new InputError("Célula muito longa.");values.push(text);}rows.push(values);});
  }else if(kind==="csv")rows=parseCsv(bytes.toString("utf8"));
  else throw new InputError("Escolha um arquivo CSV UTF-8 ou XLSX.");
  if(rows.length<2)throw new InputError("Adicione cabeçalho e registros.");
  return NextResponse.json({headers:rows[0],rows:rows.slice(1)});
 }catch(error){return operationError(error instanceof Error && !(error instanceof InputError)?new InputError("Não foi possível ler o arquivo. Use CSV UTF-8 ou XLSX de até 2 MB e 1.000 registros."):error);}
}

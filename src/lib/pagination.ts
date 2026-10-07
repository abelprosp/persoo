export function pagination(params: Record<string,string|string[]|undefined>) {
  const size=Number(params.size);
  const pageSize=[20,50,100].includes(size)?size:20;
  const page=Math.min(100000,Math.max(1,Math.floor(Number(params.page)||1)));
  return {page,pageSize,offset:(page-1)*pageSize};
}

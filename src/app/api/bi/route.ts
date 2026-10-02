import { biCors, biResourceList, authorizeExport } from "./shared";
import { NextResponse } from "next/server";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: biCors });
}

export async function GET(request: Request) {
  const auth = await authorizeExport(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: biCors }
    );
  }
  const origin = new URL(request.url).origin;
  return NextResponse.json(
    {
      workspace_id: auth.workspaceId,
      resources: biResourceList(origin),
    },
    { headers: biCors }
  );
}

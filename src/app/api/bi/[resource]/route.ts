import {
  BI_RESOURCES,
  authorizeExport,
  biCors,
  exportResource,
  parseExportQuery,
  type BiResource,
} from "../shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ resource: string }> };

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: biCors });
}

export async function GET(request: Request, { params }: Params) {
  const { resource } = await params;
  if (!BI_RESOURCES.includes(resource as BiResource)) {
    return NextResponse.json(
      { error: "Recurso desconhecido.", resources: BI_RESOURCES },
      { status: 404, headers: biCors }
    );
  }

  const auth = await authorizeExport(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: biCors }
    );
  }

  const query = parseExportQuery(new URL(request.url));
  if ("error" in query) {
    return NextResponse.json(
      { error: query.error },
      { status: 400, headers: biCors }
    );
  }

  const page = await exportResource(
    resource as BiResource,
    auth.workspaceId,
    query.limit,
    query.offset,
    query.updatedSince
  );

  return NextResponse.json(
    {
      resource,
      workspace_id: auth.workspaceId,
      limit: query.limit,
      offset: query.offset,
      updated_since: query.updatedSince,
      total: page.total,
      data: page.data,
    },
    { headers: biCors }
  );
}
